(() => {
    'use strict';

    const SESSION_KEY = 'mt.console.session';
    const THEME_KEY = 'mt.console.theme';
    const HISTORY_LIMIT = 50;
    const MASK = '•••••• hidden';
    const SECRET_KEYS = new Set(['password', 'temporaryPassword', 'newPassword', 'adminTemporaryPassword',
        'accessToken', 'refreshToken']);

    // ---------------------------------------------------------------------------------------------
    // Sections and the endpoint catalog. Set `live: true` on an endpoint once it is built.
    // ---------------------------------------------------------------------------------------------
    const SECTIONS = [
        { id: 'overview', label: 'Overview', group: 'Start', icon: 'home' },
        { id: 'auth', label: 'Authentication', group: 'Access', icon: 'key' },
        { id: 'users', label: 'Users', group: 'Tenant admin', icon: 'users' },
        { id: 'roles', label: 'Roles', group: 'Tenant admin', icon: 'shield' },
        { id: 'duties', label: 'Duties', group: 'Tenant admin', icon: 'badge' },
        { id: 'tenants', label: 'Tenants', group: 'Platform', icon: 'building' },
        { id: 'transfers', label: 'Transfers', group: 'Business', icon: 'swap' },
        { id: 'audit', label: 'Audit log', group: 'Oversight', icon: 'list' },
        { id: 'checks', label: 'Security checks', group: 'Tools', icon: 'flask' },
        { id: 'console', label: 'Request console', group: 'Tools', icon: 'terminal' },
        { id: 'history', label: 'History', group: 'Tools', icon: 'clock' },
    ];

    const SECTION_INFO = {
        auth: 'Sign in, set a first password, refresh and sign out. Tokens are opaque and stored only as hashes on the server.',
        users: 'Create users with a temporary password, see their effective duties and manage their roles.',
        roles: 'Roles group duties. Tenant admins create them at runtime and attach duties to them.',
        duties: 'Duties are permission codes such as transfer:approve. They are created at runtime, never hard-coded, and the tenant: and platform: prefixes are reserved.',
        tenants: 'Platform only: create, list and suspend tenants. These need PLATFORM-scope duties held in the Platform tenant.',
        transfers: 'Sample business workflow: employees submit transfers and managers holding transfer:approve approve or reject them. No real money moves.',
        audit: 'Every security-relevant change, newest first.',
    };

    const email = (name = 'email', extra = {}) => ({
        name, type: 'email', required: true, placeholder: 'name@company.com', autocomplete: 'username', ...extra,
    });
    const pathId = (name, label) => ({ name, label, in: 'path', type: 'number', required: true, min: 1 });

    const ENDPOINTS = [
        // Authentication
        {
            id: 'login', section: 'auth', method: 'POST', path: '/api/auth/login', title: 'Sign in',
            public: true, live: true,
            description: 'Exchange email and password for an access token (5 minutes) and a refresh token (7 days).',
            fields: [email(), { name: 'password', type: 'password', required: true, autocomplete: 'current-password' }],
        },
        {
            id: 'firstPassword', section: 'auth', method: 'POST', path: '/api/auth/first-password',
            title: 'Set your own password', public: true, live: false,
            description: 'New users sign in once with the temporary password an admin gave them, then must choose their own here.',
            fields: [
                email(),
                { name: 'temporaryPassword', type: 'password', required: true, autocomplete: 'current-password' },
                { name: 'newPassword', type: 'password', required: true, minLength: 12, maxLength: 72,
                    autocomplete: 'new-password', hint: '12 to 72 characters, different from the temporary one.' },
            ],
        },
        {
            id: 'me', section: 'auth', method: 'GET', path: '/api/me', title: 'My profile and duties', live: true,
            description: 'Who the token belongs to and the duties they hold right now, looked up live from the database.',
        },
        {
            id: 'refresh', section: 'auth', method: 'POST', path: '/api/auth/refresh', title: 'Refresh tokens',
            public: true, live: false,
            description: 'Rotate the refresh token and get a new access token. Reusing an old refresh token revokes the whole family.',
            fields: [{ name: 'refreshToken', type: 'session', source: 'refreshToken' }],
        },
        {
            id: 'logout', section: 'auth', method: 'POST', path: '/api/auth/logout', title: 'Sign out', live: false,
            description: 'Revoke the current access token and the refresh token family.',
            fields: [{ name: 'refreshToken', type: 'session', source: 'refreshToken' }],
        },

        // Users
        {
            id: 'createUser', section: 'users', method: 'POST', path: '/api/users', title: 'Create a user',
            duty: 'user:create', live: false,
            description: 'Creates a user in your tenant with a one-time temporary password they must change at first sign-in.',
            fields: [
                email('email', { autocomplete: 'off' }),
                { name: 'temporaryPassword', type: 'tempPassword', required: true, minLength: 12, maxLength: 72,
                    hint: 'Share it with the user outside the app. It expires in 24 hours.' },
                { name: 'roleIds', label: 'Role IDs', type: 'idList', placeholder: 'e.g. 3, 5',
                    hint: 'Comma-separated. Assigning roles also needs role:assign. Leave empty for none.' },
            ],
        },
        {
            id: 'listUsers', section: 'users', method: 'GET', path: '/api/users', title: 'List users',
            duty: 'user:read', live: false, description: 'All users in your tenant.',
        },
        {
            id: 'userPermissions', section: 'users', method: 'GET', path: '/api/users/{id}/permissions',
            title: "A user's effective duties", duty: 'user:read', live: false,
            description: 'The duties a user holds through their roles. Another tenant\'s user returns 404.',
            fields: [pathId('id', 'User ID')],
        },
        {
            id: 'assignRole', section: 'users', method: 'PUT', path: '/api/users/{userId}/roles/{roleId}',
            title: 'Assign a role', duty: 'role:assign', live: false,
            description: 'Gives the user every duty the role carries, from their next request on.',
            fields: [pathId('userId', 'User ID'), pathId('roleId', 'Role ID')],
        },
        {
            id: 'revokeRole', section: 'users', method: 'DELETE', path: '/api/users/{userId}/roles/{roleId}',
            title: 'Remove a role', duty: 'role:revoke', live: false,
            description: 'Takes the role away. Access is lost on the very next request.',
            fields: [pathId('userId', 'User ID'), pathId('roleId', 'Role ID')],
        },
        {
            id: 'disableUser', section: 'users', method: 'POST', path: '/api/users/{id}/disable',
            title: 'Disable a user', duty: 'user:disable', live: false,
            description: 'Disables the account and revokes its tokens immediately.',
            fields: [pathId('id', 'User ID')],
        },

        // Roles
        {
            id: 'createRole', section: 'roles', method: 'POST', path: '/api/roles', title: 'Create a role',
            duty: 'role:create', live: false, description: 'A new, empty role in your tenant.',
            fields: [
                { name: 'name', type: 'text', required: true, placeholder: 'FINANCE_MANAGER', maxLength: 100 },
                { name: 'description', type: 'text', placeholder: 'Approves transfers', maxLength: 255 },
            ],
        },
        {
            id: 'listRoles', section: 'roles', method: 'GET', path: '/api/roles', title: 'List roles',
            duty: 'role:read', live: false, description: 'All roles in your tenant with their duties.',
        },
        {
            id: 'grantDuty', section: 'roles', method: 'PUT', path: '/api/roles/{roleId}/permissions/{permissionId}',
            title: 'Add a duty to a role', duty: 'permission:assign', live: false,
            description: 'Everyone holding the role gains the duty on their next request.',
            fields: [pathId('roleId', 'Role ID'), pathId('permissionId', 'Duty ID')],
        },
        {
            id: 'revokeDuty', section: 'roles', method: 'DELETE', path: '/api/roles/{roleId}/permissions/{permissionId}',
            title: 'Remove a duty from a role', duty: 'permission:revoke', live: false,
            description: 'Everyone holding the role loses the duty on their next request.',
            fields: [pathId('roleId', 'Role ID'), pathId('permissionId', 'Duty ID')],
        },

        // Duties
        {
            id: 'createDuty', section: 'duties', method: 'POST', path: '/api/permissions', title: 'Create a duty',
            duty: 'permission:create', live: false, description: 'A new permission code your tenant can attach to roles.',
            fields: [
                { name: 'code', type: 'text', required: true, placeholder: 'transfer:approve', pattern: '[a-z]+:[a-z]+',
                    hint: 'resource:action in lowercase.' },
                { name: 'description', type: 'text', placeholder: 'Approve transfer requests', maxLength: 255 },
            ],
        },
        {
            id: 'listDuties', section: 'duties', method: 'GET', path: '/api/permissions', title: 'List duties',
            duty: 'permission:read', live: false, description: 'All duties defined in your tenant.',
        },
        {
            id: 'deactivateDuty', section: 'duties', method: 'POST', path: '/api/permissions/{id}/deactivate',
            title: 'Deactivate a duty', duty: 'permission:deactivate', live: false,
            description: 'Switches the duty off everywhere at once without deleting history.',
            fields: [pathId('id', 'Duty ID')],
        },

        // Tenants (platform)
        {
            id: 'createTenant', section: 'tenants', method: 'POST', path: '/api/platform/tenants', title: 'Create a tenant',
            duty: 'tenant:create', scope: 'platform', live: false,
            description: 'Creates the tenant, its ADMIN role with the standard admin duties, and the first admin.',
            fields: [
                { name: 'name', type: 'text', required: true, placeholder: 'ABC Finance', maxLength: 150 },
                { name: 'slug', type: 'text', required: true, placeholder: 'abc-finance', pattern: '[a-z0-9-]+',
                    maxLength: 50, hint: 'Lowercase letters, digits and dashes.' },
                email('adminEmail', { label: 'First admin email', autocomplete: 'off' }),
                { name: 'adminTemporaryPassword', label: 'First admin temporary password', type: 'tempPassword',
                    required: true, minLength: 12, maxLength: 72 },
            ],
        },
        {
            id: 'listTenants', section: 'tenants', method: 'GET', path: '/api/platform/tenants', title: 'List tenants',
            duty: 'tenant:read', scope: 'platform', live: false, description: 'Every tenant and its status.',
        },
        {
            id: 'suspendTenant', section: 'tenants', method: 'POST', path: '/api/platform/tenants/{id}/suspend',
            title: 'Suspend a tenant', duty: 'tenant:suspend', scope: 'platform', live: false,
            description: 'Blocks every user in the tenant and revokes their tokens.',
            fields: [pathId('id', 'Tenant ID')],
        },

        // Transfers
        {
            id: 'submitTransfer', section: 'transfers', method: 'POST', path: '/api/transfers', title: 'Submit a transfer',
            duty: 'transfer:create', live: false, description: 'Creates a PENDING transfer request owned by you.',
            fields: [
                { name: 'amount', type: 'decimal', required: true, min: 0.01, placeholder: '2500.00' },
                { name: 'currency', type: 'select', options: ['INR', 'USD', 'EUR'], required: true },
                { name: 'description', type: 'text', placeholder: 'Vendor invoice 1042', maxLength: 255 },
            ],
        },
        {
            id: 'listTransfers', section: 'transfers', method: 'GET', path: '/api/transfers', title: 'List transfers',
            duty: 'transfer:read', live: false, description: 'Transfers in your tenant that you are allowed to see.',
        },
        {
            id: 'approveTransfer', section: 'transfers', method: 'POST', path: '/api/transfers/{id}/approve',
            title: 'Approve a transfer', duty: 'transfer:approve', live: false,
            description: 'Allowed only if the transfer is PENDING, in your tenant, within your limit and not your own.',
            fields: [pathId('id', 'Transfer ID')],
        },
        {
            id: 'rejectTransfer', section: 'transfers', method: 'POST', path: '/api/transfers/{id}/reject',
            title: 'Reject a transfer', duty: 'transfer:approve', live: false,
            description: 'Closes a PENDING transfer with a reason.',
            fields: [pathId('id', 'Transfer ID'), { name: 'reason', type: 'text', placeholder: 'Missing invoice', maxLength: 255 }],
        },

        // Audit
        {
            id: 'auditLogs', section: 'audit', method: 'GET', path: '/api/audit-logs', title: 'Audit log',
            duty: 'audit:read', live: false, description: 'Who changed what and when, newest first.',
            fields: [
                { name: 'page', in: 'query', type: 'number', min: 0, value: '0' },
                { name: 'size', in: 'query', type: 'number', min: 1, value: '20' },
            ],
        },
    ];

    const CHECKS = [
        {
            title: 'A protected endpoint without a token is rejected', expect: [401],
            run: () => callApi({ method: 'GET', path: '/api/me', useToken: false, label: 'Check: no token' }),
        },
        {
            title: 'A malformed token is rejected', expect: [401],
            run: () => callApi({ method: 'GET', path: '/api/me', token: 'not-a-real-token', label: 'Check: malformed token' }),
        },
        {
            title: 'Invalid login input is rejected', expect: [400],
            run: () => callApi({ method: 'POST', path: '/api/auth/login', body: { email: 'not-an-email', password: '' },
                useToken: false, label: 'Check: invalid input' }),
        },
        {
            title: 'A valid token reaches /api/me', expect: [200], needsSession: true,
            run: () => callApi({ method: 'GET', path: '/api/me', label: 'Check: valid token' }),
        },
        {
            title: 'An unknown route is denied by default', expect: [403], needsSession: true,
            run: () => callApi({ method: 'GET', path: '/api/__console_check__/no-such-route', label: 'Check: unknown route' }),
        },
        {
            title: 'Paths outside /api are blocked', expect: [403], needsSession: true,
            run: () => callApi({ method: 'GET', path: '/actuator/health', label: 'Check: outside /api' }),
        },
        {
            title: 'A wrong password and an unknown email look identical', expect: [401], needsSession: true,
            run: async () => {
                const wrong = { password: 'definitely-wrong-password' };
                const a = await callApi({ method: 'POST', path: '/api/auth/login', useToken: false,
                    body: { email: state.me.email, ...wrong }, label: 'Check: wrong password' });
                const b = await callApi({ method: 'POST', path: '/api/auth/login', useToken: false,
                    body: { email: `nobody-${Date.now()}@example.test`, ...wrong }, label: 'Check: unknown email' });
                const same = a.status === b.status && a.text === b.text;
                return { status: same ? a.status : `${a.status} / ${b.status}`, pass: same && a.status === 401,
                    note: same ? 'Both responses are byte-for-byte identical.' : 'The two responses differ.' };
            },
        },
    ];

    const ICONS = {
        home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M10 21v-6h4v6'],
        key: ['M14.5 9.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z', 'M13.2 12.7 21 20.5', 'M17.5 17l2-2'],
        users: ['M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20',
            'M13.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z', 'M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35', 'M15.5 4.15a3.5 3.5 0 0 1 0 6.7'],
        shield: ['M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z'],
        badge: ['M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z', 'M9 12l2 2 4-4'],
        building: ['M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16', 'M15 9h4a1 1 0 0 1 1 1v11', 'M3 21h18', 'M8 8h3',
            'M8 12h3', 'M8 16h3'],
        swap: ['M7 4 3 8l4 4', 'M3 8h14', 'M17 20l4-4-4-4', 'M21 16H7'],
        list: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
        flask: ['M9 3h6', 'M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3', 'M7 15h10'],
        terminal: ['M4 17l6-6-6-6', 'M12 19h8'],
        clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 7v5l3 2'],
        sun: ['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4',
            'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
        moon: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z'],
        auto: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 3v18', 'M12 7h4.5', 'M12 12h6', 'M12 17h4.5'],
        logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 17l-5-5 5-5', 'M5 12h11'],
        copy: ['M9 9h10v10H9Z', 'M5 15V5h10'],
        play: ['M7 4.5v15l12-7.5Z'],
        dice: ['M20 11a8 8 0 0 0-14.6-4.5L4 8', 'M4 4v4h4', 'M4 13a8 8 0 0 0 14.6 4.5L20 16', 'M20 20v-4h-4'],
        lock: ['M6 11h12v9H6Z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
        eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
        info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'M12 11v5', 'M12 8h.01'],
        alert: ['M12 4 2.5 20h19Z', 'M12 10v4', 'M12 17h.01'],
        x: ['M6 6l12 12', 'M18 6 6 18'],
    };

    const REASONS = {
        200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
        404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict', 415: 'Unsupported Media Type',
        500: 'Internal Server Error', 503: 'Service Unavailable',
    };

    const state = { session: null, me: null, history: [], route: 'overview', prefill: {}, theme: 'auto',
        expiredNotified: false, seq: 0 };

    // ---------------------------------------------------------------------------------------------
    // Small helpers
    // ---------------------------------------------------------------------------------------------
    const $ = (selector) => document.querySelector(selector);

    function h(tag, props, ...children) {
        const node = document.createElement(tag);
        if (props) {
            for (const [key, value] of Object.entries(props)) {
                if (value === null || value === undefined || value === false) continue;
                if (key === 'class') node.className = value;
                else if (key === 'text') node.textContent = value;
                else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
                else node.setAttribute(key, value === true ? '' : String(value));
            }
        }
        for (const child of children.flat(Infinity)) {
            if (child === null || child === undefined || child === false) continue;
            node.append(child instanceof Node ? child : document.createTextNode(String(child)));
        }
        return node;
    }

    function icon(name) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('class', 'icon');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        for (const d of ICONS[name] || []) {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', d);
            svg.append(path);
        }
        return svg;
    }

    function readStorage(storage, key) {
        try { return window[storage].getItem(key); } catch { return null; }
    }
    function writeStorage(storage, key, value) {
        try {
            if (value === null) window[storage].removeItem(key);
            else window[storage].setItem(key, value);
        } catch { /* storage unavailable: the console still works for this page view */ }
    }

    const humanize = (name) => name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    const elapsed = (started) => Math.round(performance.now() - started);
    const endpoint = (id) => ENDPOINTS.find((e) => e.id === id);
    const isLive = (id) => Boolean(endpoint(id) && endpoint(id).live);

    function redact(value) {
        if (Array.isArray(value)) return value.map(redact);
        if (value && typeof value === 'object') {
            const out = {};
            for (const [k, v] of Object.entries(value)) {
                out[k] = SECRET_KEYS.has(k) && typeof v === 'string' && v ? MASK : redact(v);
            }
            return out;
        }
        return value;
    }

    function toneFor(status) {
        if (!status) return 'err';
        if (status < 300) return 'ok';
        if (status < 400) return 'info';
        if (status === 401 || status === 403 || status >= 500) return 'err';
        return 'warn';
    }

    function setBusy(button, busy) {
        button.disabled = busy;
        button.classList.toggle('is-busy', busy);
        button.setAttribute('aria-busy', String(busy));
    }

    function toast(message, tone = 'info') {
        const close = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Dismiss' }, icon('x'));
        const node = h('div', { class: `toast toast-${tone}`, role: tone === 'err' ? 'alert' : 'status' },
            h('span', { text: message }), close);
        close.addEventListener('click', () => node.remove());
        $('#toasts').append(node);
        setTimeout(() => node.remove(), 5500);
    }

    function generatePassword(length) {
        const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%*?-_'];
        const random = (max) => {
            const buffer = new Uint32Array(1);
            crypto.getRandomValues(buffer);
            return buffer[0] % max;
        };
        const all = sets.join('');
        const chars = sets.map((set) => set[random(set.length)]);
        while (chars.length < length) chars.push(all[random(all.length)]);
        for (let i = chars.length - 1; i > 0; i--) {
            const j = random(i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        return chars.join('');
    }

    // ---------------------------------------------------------------------------------------------
    // Session
    // ---------------------------------------------------------------------------------------------
    function loadSession() {
        try {
            const saved = JSON.parse(readStorage('sessionStorage', SESSION_KEY) || 'null');
            if (!saved || typeof saved.accessToken !== 'string' || typeof saved.expiresAt !== 'number') return null;
            if (saved.expiresAt <= Date.now() && !isLive('refresh')) return null;
            return saved;
        } catch {
            return null;
        }
    }

    function saveSession() {
        writeStorage('sessionStorage', SESSION_KEY, state.session ? JSON.stringify(state.session) : null);
    }

    async function setSession(tokens) {
        state.session = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + (Number(tokens.expiresIn) || 300) * 1000,
        };
        state.expiredNotified = false;
        saveSession();
        await loadMe();
    }

    function clearSession() {
        state.session = null;
        state.me = null;
        state.expiredNotified = false;
        saveSession();
    }

    async function loadMe() {
        if (!state.session) return;
        const result = await callApi({ method: 'GET', path: '/api/me', label: 'Load profile (automatic)' });
        if (result.status === 200 && result.json) {
            state.me = result.json;
        } else if (result.status === 401) {
            clearSession();
            toast('Your session is no longer valid. Sign in again.', 'warn');
        }
    }

    async function signOut() {
        if (isLive('logout') && state.session) {
            await callApi({ method: 'POST', path: endpoint('logout').path,
                body: { refreshToken: state.session.refreshToken }, label: 'Sign out' });
        }
        clearSession();
        toast('Signed out.', 'ok');
        if (location.hash !== '#/overview') location.hash = '#/overview';
        else render();
    }

    const remainingMs = () => (state.session ? state.session.expiresAt - Date.now() : 0);

    function formatRemaining(ms) {
        if (ms <= 0) return 'expired';
        const seconds = Math.ceil(ms / 1000);
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }

    function tick() {
        if (!state.session) return;
        const ms = remainingMs();
        for (const node of document.querySelectorAll('[data-timer]')) {
            node.textContent = formatRemaining(ms);
            node.classList.toggle('is-low', ms > 0 && ms < 60000);
            node.classList.toggle('is-expired', ms <= 0);
        }
        if (ms <= 0 && !state.expiredNotified) {
            state.expiredNotified = true;
            toast(isLive('refresh') ? 'Access token expired. Use Refresh tokens or sign in again.'
                : 'Access token expired. Sign in again to continue.', 'warn');
        }
    }

    // ---------------------------------------------------------------------------------------------
    // HTTP
    // ---------------------------------------------------------------------------------------------
    async function callApi({ method, path, body, useToken = true, token, record = true, label }) {
        const headers = { Accept: 'application/json' };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const bearer = token !== undefined ? token : (useToken && state.session ? state.session.accessToken : null);
        if (bearer) headers.Authorization = `Bearer ${bearer}`;

        const started = performance.now();
        let result;
        try {
            const response = await fetch(path, {
                method, headers, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            const text = await response.text();
            let json = null;
            if (text) {
                try { json = JSON.parse(text); } catch { json = null; }
            }
            result = { status: response.status, ok: response.ok, ms: elapsed(started), json, text,
                wwwAuthenticate: response.headers.get('WWW-Authenticate') };
        } catch (error) {
            result = { status: 0, ok: false, ms: elapsed(started), networkError: error.message || 'The server could not be reached.' };
        }
        if (record) pushHistory({ method, path, body, label, sentToken: Boolean(bearer), result });
        return result;
    }

    function pushHistory({ method, path, body, label, sentToken, result }) {
        state.history.unshift({
            id: ++state.seq, at: new Date(), method, path, label, sentToken,
            request: body === undefined ? undefined : redact(body),
            result: { ...result, json: redact(result.json), text: result.json ? undefined : (result.text || '').slice(0, 4000) },
        });
        state.history.length = Math.min(state.history.length, HISTORY_LIMIT);
        renderNav();
    }

    function hasDuty(ep) {
        if (!ep.duty || !state.me) return null;
        const list = ep.scope === 'platform' ? state.me.platformDuties : state.me.duties;
        return Array.isArray(list) && list.includes(ep.duty);
    }

    function explain(result, ep) {
        const status = result.status;
        const error = result.json && result.json.error;
        if (!status) return 'The request never reached the server. Is the application running?';
        if (status === 401) {
            return ep && ep.public
                ? 'Credentials rejected. A wrong password and an unknown email return the same message, so accounts cannot be discovered.'
                : 'No valid access token was sent, or it expired (access tokens last 5 minutes).';
        }
        if (status === 403) {
            if (error === 'PASSWORD_CHANGE_REQUIRED') {
                return 'The temporary password was correct, but you must set your own password before tokens are issued.';
            }
            if (ep && !ep.live) return 'Not built yet. The authorization core denies routes it cannot match, so planned endpoints return 403.';
            if (ep && ep.duty && state.me && !hasDuty(ep)) {
                return `You do not hold ${ep.duty}${ep.scope === 'platform' ? ' (platform scope)' : ''}, so the request was refused before it reached the service.`;
            }
            return 'Signed in, but the authorization core refused the request.';
        }
        if (status === 400) return 'The request failed validation.';
        if (status === 404) return 'Not found, or it belongs to another tenant. Both look the same on purpose.';
        if (status === 409) return 'Conflict: it already exists.';
        if (status >= 500) return 'Server error. Check the application log.';
        if (status === 204) return 'Done. There is no response body.';
        return null;
    }

    // ---------------------------------------------------------------------------------------------
    // Rendering: JSON and responses
    // ---------------------------------------------------------------------------------------------
    function renderJson(value, depth = 0) {
        const fragment = document.createDocumentFragment();
        const pad = '  '.repeat(depth);
        const token = (cls, text) => h('span', { class: cls, text });
        if (value === null) {
            fragment.append(token('j-null', 'null'));
        } else if (Array.isArray(value)) {
            if (!value.length) { fragment.append('[]'); return fragment; }
            fragment.append('[\n');
            value.forEach((item, i) => fragment.append(pad, '  ', renderJson(item, depth + 1), i < value.length - 1 ? ',\n' : '\n'));
            fragment.append(pad, ']');
        } else if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (!keys.length) { fragment.append('{}'); return fragment; }
            fragment.append('{\n');
            keys.forEach((key, i) => fragment.append(pad, '  ', token('j-key', JSON.stringify(key)), ': ',
                renderJson(value[key], depth + 1), i < keys.length - 1 ? ',\n' : '\n'));
            fragment.append(pad, '}');
        } else if (typeof value === 'string') {
            fragment.append(token(value === MASK ? 'j-mask' : 'j-str', JSON.stringify(value)));
        } else if (typeof value === 'number') {
            fragment.append(token('j-num', String(value)));
        } else {
            fragment.append(token('j-bool', String(value)));
        }
        return fragment;
    }

    function statusPill(result) {
        if (!result.status) return h('span', { class: 'status status-err', text: 'ERR' });
        return h('span', { class: `status status-${toneFor(result.status)}`, text: String(result.status) });
    }

    function renderResponse(box, result, ep) {
        box.hidden = false;
        box.replaceChildren();
        const reason = result.status ? `${result.status} ${REASONS[result.status] || ''}`.trim() : 'Network error';
        box.append(h('div', { class: 'response-head' },
            h('span', { class: `status status-${toneFor(result.status)}`, text: reason }),
            h('span', { class: 'muted', text: `${result.ms} ms` }),
            result.wwwAuthenticate ? h('code', { class: 'muted', text: `WWW-Authenticate: ${result.wwwAuthenticate}` }) : null));
        const note = result.networkError || explain(result, ep);
        if (note) box.append(h('p', { class: 'explain', text: note }));
        if (result.json !== null && result.json !== undefined) {
            box.append(h('pre', { class: 'code', tabindex: '0' }, renderJson(redact(result.json))));
        } else if (result.text) {
            box.append(h('pre', { class: 'code', tabindex: '0', text: result.text.slice(0, 4000) }));
        } else if (!result.networkError) {
            box.append(h('pre', { class: 'code muted', text: '(empty body)' }));
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Rendering: endpoint cards
    // ---------------------------------------------------------------------------------------------
    function badge(cls, text, title) {
        return h('span', { class: `badge ${cls}`, text, title });
    }

    function methodBadge(method) {
        return h('span', { class: `method method-${method.toLowerCase()}`, text: method });
    }

    function endpointMeta(ep) {
        const chips = [ep.live ? badge('badge-live', 'Live') : badge('badge-planned', 'Planned', 'Not built yet')];
        if (ep.scope === 'platform') chips.push(badge('badge-platform', 'Platform scope'));
        if (ep.public) {
            chips.push(badge('badge-public', 'Public'));
        } else if (!ep.duty) {
            chips.push(badge('badge-info', 'Any signed-in user'));
        } else {
            const held = hasDuty(ep);
            if (held === null) chips.push(badge('badge-info', `Needs ${ep.duty}`));
            else chips.push(badge(held ? 'badge-have' : 'badge-missing', `${held ? 'You hold' : 'Missing'} ${ep.duty}`));
        }
        return h('div', { class: 'meta' }, chips);
    }

    function renderField(ep, field, prefill) {
        const id = `f-${ep.id}-${field.name}`;
        const label = field.label || humanize(field.name);
        const hintId = field.hint ? `${id}-hint` : null;
        const where = field.in === 'path' || field.in === 'query' ? field.in : null;
        const labelNode = h('label', { for: id }, label,
            field.required ? h('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : null,
            where ? h('span', { class: 'loc', text: where }) : null);
        const hint = field.hint ? h('p', { class: 'hint', id: hintId, text: field.hint }) : null;

        if (field.type === 'session') {
            const available = Boolean(state.session && state.session[field.source]);
            return h('div', { class: 'field' },
                h('span', { class: 'label-like', text: label }),
                h('div', { class: `session-value${available ? ' is-set' : ''}` }, icon('lock'),
                    h('span', { text: available ? 'Taken from your current session' : 'Sign in first: there is no token in this tab' })),
                hint);
        }

        const initial = prefill !== undefined ? prefill : (field.value !== undefined ? field.value : '');
        const common = {
            id, name: field.name, required: field.required, placeholder: field.placeholder,
            autocomplete: field.autocomplete || 'off', minlength: field.minLength, maxlength: field.maxLength,
            pattern: field.pattern, 'aria-describedby': hintId,
        };
        let control;
        switch (field.type) {
            case 'select':
                control = h('select', { id, name: field.name, required: field.required, 'aria-describedby': hintId },
                    field.options.map((option) => h('option', { value: option, text: option, selected: option === initial })));
                break;
            case 'number':
            case 'decimal':
                control = h('input', { ...common, type: 'number', inputmode: field.type === 'decimal' ? 'decimal' : 'numeric',
                    min: field.min, step: field.type === 'decimal' ? '0.01' : '1' });
                control.value = initial;
                break;
            case 'password': {
                const input = h('input', { ...common, type: 'password', autocomplete: field.autocomplete || 'current-password' });
                input.value = initial;
                const toggle = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Show password', 'aria-pressed': 'false' }, icon('eye'));
                toggle.addEventListener('click', () => {
                    const show = input.type === 'password';
                    input.type = show ? 'text' : 'password';
                    toggle.setAttribute('aria-pressed', String(show));
                    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
                });
                control = h('div', { class: 'input-wrap' }, input, toggle);
                break;
            }
            case 'tempPassword': {
                const input = h('input', { ...common, type: 'text', class: 'mono', spellcheck: 'false' });
                input.value = initial;
                const generate = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, icon('dice'), 'Generate');
                generate.addEventListener('click', () => { input.value = generatePassword(16); input.focus(); });
                control = h('div', { class: 'input-wrap has-btn' }, input, generate);
                break;
            }
            default:
                control = h('input', { ...common, type: field.type === 'email' ? 'email' : 'text',
                    class: field.type === 'idList' ? 'mono' : null, inputmode: field.type === 'idList' ? 'numeric' : null });
                control.value = initial;
        }
        return h('div', { class: 'field' }, labelNode, control, hint);
    }

    function convert(field, value) {
        const label = field.label || humanize(field.name);
        if (field.type === 'number' || field.type === 'decimal') {
            const number = Number(value);
            if (!Number.isFinite(number)) throw new Error(`${label} must be a number.`);
            return number;
        }
        if (field.type === 'idList') {
            const ids = String(value).split(/[\s,]+/).filter(Boolean).map(Number);
            if (ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new Error(`${label} must be positive whole numbers.`);
            return ids;
        }
        return value;
    }

    function collect(ep, form) {
        const raw = {};
        const pathValues = {};
        const query = new URLSearchParams();
        const body = {};
        let bodyFields = 0;
        for (const field of ep.fields || []) {
            const where = field.in || 'body';
            if (where === 'body') bodyFields++;
            let value;
            if (field.type === 'session') {
                value = state.session ? state.session[field.source] : undefined;
            } else {
                value = form.elements.namedItem(field.name).value;
                if (field.type !== 'password' && field.type !== 'tempPassword') value = value.trim();
                raw[field.name] = value;
            }
            if (value === '' || value === undefined || value === null) {
                if (field.type === 'idList' && where === 'body') body[field.name] = [];
                continue;
            }
            value = convert(field, value);
            if (where === 'path') pathValues[field.name] = value;
            else if (where === 'query') query.set(field.name, String(value));
            else body[field.name] = value;
        }
        let path = ep.path.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(pathValues[key] ?? ''));
        const qs = query.toString();
        if (qs) path += `?${qs}`;
        return { raw, path, body: bodyFields ? body : undefined };
    }

    function curlFor(ep, request, useToken) {
        const quote = (text) => `'${String(text).replace(/'/g, "'\\''")}'`;
        const lines = [`curl -i -X ${ep.method} ${quote(location.origin + request.path)}`];
        if (useToken) lines.push('  -H "Authorization: Bearer $TOKEN"');
        if (request.body !== undefined) {
            lines.push("  -H 'Content-Type: application/json'");
            lines.push(`  -d ${quote(JSON.stringify(request.body))}`);
        }
        return lines.join(' \\\n');
    }

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            toast('Copied to the clipboard.', 'ok');
        } catch {
            toast('The clipboard is not available in this browser.', 'warn');
        }
    }

    function renderEndpointCard(ep) {
        const form = h('form', { class: 'ep-form' });
        const prefill = state.prefill[ep.id] || {};
        const fields = ep.fields && ep.fields.length
            ? h('div', { class: 'fields' }, ep.fields.map((field) => renderField(ep, field, prefill[field.name])))
            : null;
        const tokenToggle = ep.public ? null : h('input', { type: 'checkbox', id: `t-${ep.id}`, checked: true });
        const sendButton = h('button', { type: 'submit', class: 'btn btn-primary' }, icon('play'), h('span', { text: 'Send request' }));
        const curlButton = h('button', { type: 'button', class: 'btn btn-ghost' }, icon('copy'), h('span', { text: 'Copy cURL' }));
        const responseBox = h('div', { class: 'response', hidden: true, 'aria-live': 'polite' });

        form.append(fields || '', h('div', { class: 'actions' },
            tokenToggle ? h('label', { class: 'check', for: `t-${ep.id}` }, tokenToggle, h('span', { text: 'Send access token' })) : null,
            curlButton, sendButton));

        curlButton.addEventListener('click', () => {
            if (!form.reportValidity()) return;
            try {
                copyText(curlFor(ep, collect(ep, form), tokenToggle ? tokenToggle.checked : false));
            } catch (error) {
                toast(error.message, 'err');
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            let request;
            try {
                request = collect(ep, form);
            } catch (error) {
                toast(error.message, 'err');
                return;
            }
            const useToken = ep.public ? false : tokenToggle.checked;
            if (useToken && !state.session) toast('You are not signed in, so this is sent without a token.', 'warn');
            setBusy(sendButton, true);
            const result = await callApi({ method: ep.method, path: request.path, body: request.body, useToken, label: ep.title });
            setBusy(sendButton, false);
            renderResponse(responseBox, result, ep);
            await afterResponse(ep, result, request, useToken && Boolean(state.session));
        });

        return h('article', { class: 'card endpoint', id: `ep-${ep.id}` },
            h('div', { class: 'ep-head' }, methodBadge(ep.method),
                h('div', { class: 'ep-titles' }, h('h3', { class: 'ep-title', text: ep.title }), h('code', { class: 'ep-path', text: ep.path }))),
            endpointMeta(ep),
            ep.description ? h('p', { class: 'ep-desc', text: ep.description }) : null,
            form, responseBox);
    }

    async function afterResponse(ep, result, request, sentToken) {
        if (ep.id === 'login') {
            if (result.ok && result.json && result.json.accessToken) {
                state.prefill = {};
                await setSession(result.json);
                toast('Signed in.', 'ok');
                render();
            } else if (result.status === 403 && result.json && result.json.error === 'PASSWORD_CHANGE_REQUIRED') {
                state.prefill.firstPassword = { email: request.raw.email };
                toast('Choose your own password to finish signing in.', 'warn');
                goTo('auth', 'ep-firstPassword');
            }
            return;
        }
        if (ep.id === 'firstPassword' && result.ok) {
            state.prefill.login = { email: request.raw.email };
            toast('Password set. Sign in with your new password.', 'ok');
            goTo('overview');
            return;
        }
        if (ep.id === 'refresh' && result.ok && result.json && result.json.accessToken) {
            await setSession(result.json);
            toast('Tokens refreshed.', 'ok');
            render();
            return;
        }
        if (ep.id === 'logout' && result.ok) {
            clearSession();
            toast('Signed out.', 'ok');
            goTo('overview');
            return;
        }
        if (result.status === 401 && sentToken && !ep.public) {
            clearSession();
            toast('Your session expired or was revoked. Sign in again.', 'warn');
            renderSession();
            return;
        }
        if (result.ok && ep.method !== 'GET' && state.session) {
            await loadMe();
            renderSession();
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Rendering: shell
    // ---------------------------------------------------------------------------------------------
    function renderNav() {
        const nav = $('#sidebar');
        nav.replaceChildren();
        let group = null;
        let list = null;
        for (const section of SECTIONS) {
            if (section.group !== group) {
                group = section.group;
                list = h('ul', { class: 'nav-list' });
                nav.append(h('div', { class: 'nav-group' }, h('p', { class: 'nav-title', text: group }), list));
            }
            const endpoints = ENDPOINTS.filter((e) => e.section === section.id);
            let count = null;
            if (endpoints.length) {
                count = h('span', { class: 'count', title: 'Live endpoints out of total',
                    text: `${endpoints.filter((e) => e.live).length}/${endpoints.length}` });
            } else if (section.id === 'history' && state.history.length) {
                count = h('span', { class: 'count', text: String(state.history.length) });
            }
            list.append(h('li', null, h('a', { class: 'nav-link', href: `#/${section.id}`,
                'aria-current': state.route === section.id ? 'page' : null }, icon(section.icon), h('span', { text: section.label }), count)));
        }
        nav.append(h('div', { class: 'nav-foot' },
            h('p', { class: 'muted small', text: 'Requests go only to this server. Tokens stay in this browser tab.' })));
    }

    function renderSession() {
        const box = $('#session');
        box.replaceChildren();
        if (!state.session) {
            box.append(h('span', { class: 'muted small hide-sm', text: 'Not signed in' }),
                h('a', { class: 'btn btn-primary btn-sm', href: '#/overview', text: 'Sign in' }));
            return;
        }
        const me = state.me;
        const name = me ? me.email : 'Signed in';
        box.append(
            h('div', { class: 'chip', title: me ? `${me.email} · ${me.tenantSlug}` : null },
                h('span', { class: 'avatar', 'aria-hidden': 'true', text: name.charAt(0).toUpperCase() }),
                h('span', { class: 'chip-text' }, h('span', { class: 'chip-name', text: name }),
                    me ? h('span', { class: 'chip-sub', text: `${me.tenantSlug} · ${me.tenantType}` }) : null),
                h('span', { class: 'timer', 'data-timer': '', title: 'Time left on the access token' })),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Sign out', title: 'Sign out', onClick: signOut }, icon('logout')));
        tick();
    }

    function pageHead(title, lead) {
        return h('header', { class: 'page-head' }, h('h1', { text: title, tabindex: '-1' }), lead ? h('p', { class: 'lead', text: lead }) : null);
    }

    function callout(text, tone = 'info') {
        return h('div', { class: `callout${tone === 'warn' ? ' callout-warn' : ''}` }, icon(tone === 'warn' ? 'alert' : 'info'), h('p', { text }));
    }

    // ---------------------------------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------------------------------
    function renderOverview(main) {
        if (!state.session) {
            main.append(pageHead('Overview', 'Sign in to explore the multi-tenant authorization engine.'),
                h('div', { class: 'grid-2' }, renderEndpointCard(endpoint('login')), guideCard()));
            return;
        }
        main.append(pageHead('Overview', 'Your identity and the duties you hold right now, straight from the database.'));
        if (!state.me) {
            main.append(h('div', { class: 'card' }, h('p', { class: 'muted', text: 'Loading your profile…' })));
            return;
        }
        main.append(h('div', { class: 'grid-2' }, profileCard(state.me), progressCard()), dutiesCard(state.me));
    }

    function guideCard() {
        return h('section', { class: 'card' },
            h('h2', { class: 'card-title', text: 'How this console works' }),
            h('ol', { class: 'steps' },
                h('li', null, h('strong', { text: 'Sign in' }), ' with the platform admin from your PLATFORM_ADMIN_* environment variables, or any user.'),
                h('li', null, h('strong', { text: 'Pick a section. ' }), 'Every card shows the duty it needs and whether you hold it.'),
                h('li', null, h('strong', { text: 'Send requests ' }), 'and compare 200 with 401 and 403. Untick "Send access token" to try without one.'),
                h('li', null, h('strong', { text: 'Run Security checks ' }), 'before a demo to prove the negative cases.')),
            h('p', { class: 'muted small', text: 'Tokens are kept only in this tab (sessionStorage) and are never shown on screen.' }));
    }

    function profileCard(me) {
        const rows = [
            ['User ID', String(me.userId)],
            ['Email', me.email],
            ['Tenant', `${me.tenantSlug} (ID ${me.tenantId})`],
            ['Tenant type', me.tenantType],
        ];
        return h('section', { class: 'card' },
            h('h2', { class: 'card-title', text: 'Signed in as' }),
            h('dl', { class: 'dl' },
                rows.map(([term, value]) => [h('dt', { text: term }), h('dd', { text: value })]),
                h('dt', { text: 'Token expires in' }), h('dd', null, h('span', { class: 'timer', 'data-timer': '' }))));
    }

    function progressCard() {
        const live = ENDPOINTS.filter((e) => e.live).length;
        const planned = ENDPOINTS.filter((e) => !e.live);
        return h('section', { class: 'card' },
            h('h2', { class: 'card-title', text: 'API build progress' }),
            h('div', { class: 'progress-row' }, h('span', { class: 'progress-big', text: String(live) }),
                h('span', { class: 'muted', text: `of ${ENDPOINTS.length} endpoints live` })),
            h('progress', { value: live, max: ENDPOINTS.length, 'aria-label': 'Endpoints live' }),
            planned.length ? h('ul', { class: 'next-list' }, planned.slice(0, 4).map((ep) =>
                h('li', null, h('a', { href: `#/${ep.section}` }, methodBadge(ep.method), h('span', { class: 'mono', text: ep.path }))))) : null);
    }

    function dutiesCard(me) {
        const duties = Array.isArray(me.duties) ? [...me.duties].sort() : [];
        const platform = Array.isArray(me.platformDuties) ? [...me.platformDuties].sort() : [];
        const groups = new Map();
        for (const duty of duties) {
            const [resource] = duty.split(':');
            if (!groups.has(resource)) groups.set(resource, []);
            groups.get(resource).push(duty);
        }
        return h('section', { class: 'card' },
            h('div', { class: 'card-row' },
                h('h2', { class: 'card-title', text: `Your duties (${duties.length})` }),
                platform.length ? badge('badge-platform', `${platform.length} platform`) : null),
            h('p', { class: 'muted small', text: 'Looked up live on every request. Remove one and the next call is refused, without signing out.' }),
            duties.length
                ? h('div', { class: 'duty-groups' }, [...groups.entries()].map(([resource, codes]) =>
                    h('div', { class: 'duty-group' }, h('h3', { text: resource }),
                        h('div', { class: 'duty-list' }, codes.map((code) =>
                            h('span', { class: `duty-chip${platform.includes(code) ? ' is-platform' : ''}`, text: code }))))))
                : h('p', { class: 'empty', text: 'No duties yet. Ask an admin to assign you a role that carries duties.' }));
    }

    function renderSection(main, sectionId) {
        const section = SECTIONS.find((s) => s.id === sectionId);
        const endpoints = ENDPOINTS.filter((e) => e.section === sectionId);
        main.append(pageHead(section.label, SECTION_INFO[sectionId]));
        if (sectionId === 'tenants' && state.me && state.me.tenantType !== 'PLATFORM') {
            main.append(callout(`You are in the ${state.me.tenantSlug} tenant, not the Platform tenant, so these return 403 for you.`, 'warn'));
        }
        if (!endpoints.some((e) => e.live)) {
            main.append(callout('None of these endpoints are built yet. The forms follow the planned API contract and return 403 until each one ships. Set live: true in static/js/console.js as you build them.'));
        }
        main.append(h('div', { class: 'stack' }, endpoints.map(renderEndpointCard)));
    }

    function renderChecks(main) {
        main.append(pageHead('Security checks', 'One click runs the negative tests a reviewer will ask about. Run them before a demo.'));
        const runButton = h('button', { type: 'button', class: 'btn btn-primary' }, icon('play'), h('span', { text: 'Run all checks' }));
        const summary = h('p', { class: 'muted', 'aria-live': 'polite', text: state.session ? '' : 'Sign in first to run every check.' });
        const rows = CHECKS.map((check) => {
            const pill = h('span', { class: 'pill pill-idle', text: 'Not run' });
            const actual = h('span', { class: 'mono', text: '—' });
            const note = h('p', { class: 'muted small' });
            const row = h('li', { class: 'check-row' },
                h('div', { class: 'check-main' }, h('p', { class: 'check-title', text: check.title }), note),
                h('div', { class: 'check-cell' }, h('span', { class: 'cell-label', text: 'Expected' }), h('span', { class: 'mono', text: check.expect.join(' or ') })),
                h('div', { class: 'check-cell' }, h('span', { class: 'cell-label', text: 'Actual' }), actual),
                h('div', { class: 'check-cell' }, pill));
            return { check, row, pill, actual, note };
        });

        runButton.addEventListener('click', async () => {
            setBusy(runButton, true);
            let passed = 0;
            let failed = 0;
            let skipped = 0;
            for (const item of rows) {
                item.note.textContent = '';
                if (item.check.needsSession && !(state.session && state.me)) {
                    skipped++;
                    item.pill.className = 'pill pill-skip';
                    item.pill.textContent = 'Skipped';
                    item.actual.textContent = '—';
                    item.note.textContent = 'Sign in first.';
                    continue;
                }
                item.pill.className = 'pill pill-run';
                item.pill.textContent = 'Running';
                const result = await item.check.run();
                const pass = result.pass !== undefined ? result.pass : item.check.expect.includes(result.status);
                item.actual.textContent = result.status ? String(result.status) : 'network error';
                item.pill.className = `pill ${pass ? 'pill-pass' : 'pill-fail'}`;
                item.pill.textContent = pass ? 'Pass' : 'Fail';
                if (result.note) item.note.textContent = result.note;
                if (pass) passed++; else failed++;
            }
            summary.textContent = `${passed} passed · ${failed} failed · ${skipped} skipped`;
            setBusy(runButton, false);
        });

        main.append(h('section', { class: 'card' }, h('div', { class: 'card-row' }, runButton, summary),
            h('ul', { class: 'checks' }, rows.map((r) => r.row))));
    }

    function sampleBody(ep) {
        const sample = {};
        for (const field of ep.fields || []) {
            if ((field.in || 'body') !== 'body') continue;
            if (field.type === 'idList') sample[field.name] = [];
            else if (field.type === 'number' || field.type === 'decimal') sample[field.name] = 1;
            else if (field.type === 'select') sample[field.name] = field.options[0];
            else if (field.type === 'email') sample[field.name] = 'name@company.com';
            else sample[field.name] = field.placeholder && field.type === 'text' ? field.placeholder : '';
        }
        return Object.keys(sample).length ? JSON.stringify(sample, null, 2) : '';
    }

    function matchEndpoint(method, path) {
        const clean = path.split('?')[0];
        return ENDPOINTS.find((ep) => ep.method === method
            && new RegExp(`^${ep.path.replace(/\{\w+\}/g, '[^/]+')}$`).test(clean)) || null;
    }

    function renderConsole(main) {
        main.append(pageHead('Request console', 'Send any request to this server. Handy for an endpoint you have just built.'));
        const method = h('select', { id: 'c-method', 'aria-label': 'HTTP method' },
            ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => h('option', { value: m, text: m })));
        const path = h('input', { id: 'c-path', class: 'mono', value: '/api/me', required: true, spellcheck: 'false',
            autocomplete: 'off', 'aria-label': 'Path', placeholder: '/api/…' });
        const tokenToggle = h('input', { type: 'checkbox', id: 'c-token', checked: true });
        const body = h('textarea', { id: 'c-body', class: 'mono', rows: 8, spellcheck: 'false', placeholder: '{ "key": "value" }',
            'aria-label': 'JSON body' });
        const preset = h('select', { id: 'c-preset', 'aria-label': 'Load an endpoint' }, h('option', { value: '', text: 'Load an endpoint…' }),
            SECTIONS.filter((s) => ENDPOINTS.some((e) => e.section === s.id)).map((s) =>
                h('optgroup', { label: s.label }, ENDPOINTS.filter((e) => e.section === s.id).map((e) =>
                    h('option', { value: e.id, text: `${e.method} ${e.path}${e.live ? '' : '  (planned)'}` })))));
        const error = h('p', { class: 'field-error', role: 'alert', hidden: true });
        const sendButton = h('button', { type: 'submit', class: 'btn btn-primary' }, icon('play'), h('span', { text: 'Send request' }));
        const responseBox = h('div', { class: 'response', hidden: true, 'aria-live': 'polite' });

        const syncBody = () => { body.disabled = method.value === 'GET'; };
        method.addEventListener('change', syncBody);
        preset.addEventListener('change', () => {
            const ep = endpoint(preset.value);
            if (!ep) return;
            method.value = ep.method;
            path.value = ep.path;
            body.value = sampleBody(ep);
            tokenToggle.checked = !ep.public;
            syncBody();
            path.focus();
        });
        syncBody();

        const form = h('form', null,
            h('div', { class: 'console-tools' }, preset),
            h('div', { class: 'console-line' }, method, path),
            h('div', { class: 'field ep-form' }, h('label', { for: 'c-body', text: 'JSON body' }), body),
            error,
            h('div', { class: 'actions' }, h('label', { class: 'check', for: 'c-token' }, tokenToggle, h('span', { text: 'Send access token' })), sendButton));

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            error.hidden = true;
            const target = path.value.trim();
            if (!/^\/(?!\/)/.test(target)) {
                error.textContent = 'Use a path on this server that starts with a single "/". Tokens are never sent to other sites.';
                error.hidden = false;
                return;
            }
            let payload;
            if (method.value !== 'GET' && body.value.trim()) {
                try {
                    payload = JSON.parse(body.value);
                } catch (e) {
                    error.textContent = `The body is not valid JSON: ${e.message}`;
                    error.hidden = false;
                    return;
                }
            }
            setBusy(sendButton, true);
            const result = await callApi({ method: method.value, path: target, body: payload,
                useToken: tokenToggle.checked, label: 'Request console' });
            setBusy(sendButton, false);
            renderResponse(responseBox, result, matchEndpoint(method.value, target));
        });

        main.append(h('section', { class: 'card' }, form, responseBox));
    }

    function renderHistory(main) {
        main.append(pageHead('History', `The last ${HISTORY_LIMIT} requests from this tab. Passwords and tokens are masked.`));
        if (!state.history.length) {
            main.append(h('section', { class: 'card' }, h('p', { class: 'empty', text: 'No requests yet. Send something from any section and it appears here.' })));
            return;
        }
        const clear = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'Clear history');
        clear.addEventListener('click', () => { state.history = []; render(); });
        const list = h('ul', { class: 'history' });
        for (const item of state.history) {
            const detail = h('div', { class: 'history-detail', hidden: true });
            const row = h('button', { type: 'button', class: 'history-row', 'aria-expanded': 'false' },
                methodBadge(item.method), h('span', { class: 'mono path', text: item.path }),
                item.label ? h('span', { class: 'muted small hide-sm', text: item.label }) : null,
                statusPill(item.result), h('span', { class: 'muted small', text: `${item.result.ms} ms` }),
                h('time', { class: 'muted small hide-sm', datetime: item.at.toISOString(), text: item.at.toLocaleTimeString() }));
            row.addEventListener('click', () => {
                const open = detail.hidden;
                detail.hidden = !open;
                row.setAttribute('aria-expanded', String(open));
                if (open && !detail.childNodes.length) {
                    detail.append(h('p', { class: 'muted small', text: item.sentToken ? 'Sent with an access token.' : 'Sent without a token.' }));
                    if (item.request !== undefined) {
                        detail.append(h('h3', { text: 'Request body' }), h('pre', { class: 'code' }, renderJson(item.request)));
                    }
                    const response = h('div', { class: 'response' });
                    renderResponse(response, item.result, matchEndpoint(item.method, item.path));
                    detail.append(h('h3', { text: 'Response' }), response);
                }
            });
            list.append(h('li', null, row, detail));
        }
        main.append(h('section', { class: 'card' }, h('div', { class: 'card-row' },
            h('p', { class: 'muted small', text: `${state.history.length} request${state.history.length === 1 ? '' : 's'}` }), clear), list));
    }

    // ---------------------------------------------------------------------------------------------
    // Router and startup
    // ---------------------------------------------------------------------------------------------
    function currentRoute() {
        const route = location.hash.replace(/^#\/?/, '').split('?')[0];
        return SECTIONS.some((s) => s.id === route) ? route : 'overview';
    }

    function render() {
        state.route = currentRoute();
        renderNav();
        renderSession();
        const main = $('#main');
        main.replaceChildren();
        if (state.route === 'overview') renderOverview(main);
        else if (state.route === 'checks') renderChecks(main);
        else if (state.route === 'console') renderConsole(main);
        else if (state.route === 'history') renderHistory(main);
        else renderSection(main, state.route);
        toggleNav(false);
        tick();
    }

    function goTo(route, anchorId) {
        const target = `#/${route}`;
        if (location.hash === target) render();
        else location.hash = target;
        if (anchorId) {
            setTimeout(() => {
                const node = document.getElementById(anchorId);
                if (node) node.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }, 60);
        }
    }

    function focusHeading() {
        const heading = $('#main h1');
        if (heading) heading.focus({ preventScroll: true });
        window.scrollTo({ top: 0 });
    }

    function toggleNav(force) {
        const open = force !== undefined ? force : !document.body.classList.contains('nav-open');
        document.body.classList.toggle('nav-open', open);
        $('#menuBtn').setAttribute('aria-expanded', String(open));
        $('#menuBtn').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        $('#overlay').hidden = !open;
    }

    const THEMES = ['auto', 'light', 'dark'];

    function applyTheme(theme) {
        const value = THEMES.includes(theme) ? theme : 'auto';
        if (value === 'auto') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = value;
        const button = $('#themeBtn');
        button.replaceChildren(icon(value === 'dark' ? 'moon' : value === 'light' ? 'sun' : 'auto'));
        button.setAttribute('aria-label', `Theme: ${value}. Click to change.`);
        button.title = `Theme: ${value}`;
        state.theme = value;
    }

    async function init() {
        applyTheme(readStorage('localStorage', THEME_KEY));
        $('#themeBtn').addEventListener('click', () => {
            const next = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
            applyTheme(next);
            writeStorage('localStorage', THEME_KEY, next);
        });
        $('#menuBtn').addEventListener('click', () => toggleNav());
        $('#overlay').addEventListener('click', () => toggleNav(false));
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toggleNav(false); });
        window.addEventListener('hashchange', () => { render(); focusHeading(); });

        state.session = loadSession();
        render();
        if (state.session) {
            await loadMe();
            render();
        }
        setInterval(tick, 1000);
    }

    document.addEventListener('DOMContentLoaded', init);
})();

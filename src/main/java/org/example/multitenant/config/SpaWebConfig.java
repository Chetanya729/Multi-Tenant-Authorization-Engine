package org.example.multitenant.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Serves the built dashboard (frontend/dist, copied to classpath:/static by the Maven build).
 * Dashboard routes such as /users or /transfers/approvals have no file behind them, so they get index.html
 * and the React router takes over in the browser.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    private static final String STATIC = "classpath:/static/";

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Vite puts a content hash in every file name under /assets, so these can be cached for a year.
        registry.addResourceHandler("/assets/**")
                .addResourceLocations(STATIC + "assets/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .setUseLastModified(false);

        // Everything else, including index.html, is fetched again on every load so a new release is picked up.
        // Last-Modified is off because files inside the jar all carry the same fixed build timestamp, which would
        // make browsers keep an old index.html (304 Not Modified) that points at assets the new release removed.
        registry.addResourceHandler("/**")
                .addResourceLocations(STATIC)
                .setCacheControl(CacheControl.noCache())
                .setUseLastModified(false)
                .resourceChain(true)
                .addResolver(new SpaFallbackResolver());
    }

    static class SpaFallbackResolver extends PathResourceResolver {
        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource file = super.getResource(resourcePath, location);
            if (file != null) {
                return file;
            }
            // Unknown API paths and missing files (anything with an extension) stay 404.
            if (resourcePath.startsWith("api/") || resourcePath.contains(".")) {
                return null;
            }
            Resource index = location.createRelative("index.html");
            return index.exists() && index.isReadable() ? index : null;
        }
    }
}

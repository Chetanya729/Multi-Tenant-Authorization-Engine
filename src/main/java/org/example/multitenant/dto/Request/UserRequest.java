package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.Email;
import lombok.*;
import org.example.multitenant.enums.PermissionScope;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {

    @Email @NonNull
    private  String email;

    @NonNull
    private String password;






}

package org.example.multitenant.dto.Request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserRequest {

    @Email@NotBlank
    private String email;
    @NotBlank
    private String password;

}

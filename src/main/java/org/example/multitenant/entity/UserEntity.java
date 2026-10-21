package org.example.multitenant.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "users")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long user_id;

    private int tenant_id;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(nullable = false)
    private String password_hash;

    private boolean enabled;

}

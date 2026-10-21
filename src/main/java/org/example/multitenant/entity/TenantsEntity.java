package org.example.multitenant.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.multitenant.enums.Status;


@Entity
@Table(name = "tenants")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TenantsEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tenant_id;

    @Column(nullable = false, unique = true)
    private String tenant_name;

    @Enumerated(EnumType.STRING)
    private Status status;
}

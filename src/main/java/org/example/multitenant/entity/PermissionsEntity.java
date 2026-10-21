package org.example.multitenant.entity;


import jakarta.persistence.*;

@Entity
@Table(name = "permissions")
public class PermissionsEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long permission_id;

    @Column(nullable = false)
    private String code;
    @Column(nullable = false)
    private String Scope;

    private String description;

    private boolean active;

}

package com.demo.wallet_core.persistence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_user")
public class AppUser {

	@Id
	private UUID id;

	@Column(nullable = false)
	private String email;

	@Column(nullable = false)
	private String dni;

	@Column(nullable = false)
	private String names;

	@Column(nullable = false)
	private String phone;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected AppUser() {
	}

	public AppUser(UUID id, String email, String dni, String names, String phone, Instant createdAt) {
		this.id = id;
		this.email = email;
		this.dni = dni;
		this.names = names;
		this.phone = phone;
		this.createdAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getDni() {
		return dni;
	}

	public String getNames() {
		return names;
	}

	public String getPhone() {
		return phone;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}

package com.demo.wallet_core;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WalletCoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(WalletCoreApplication.class, args);
	}

}

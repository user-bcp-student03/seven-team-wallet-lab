package com.demo.wallet_core.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.demo.wallet_core.application.AuthService;

@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final AuthService authService;

	public WebConfig(AuthService authService) {
		this.authService = authService;
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(new AuthenticationInterceptor(authService)).addPathPatterns("/api/v1/payments/**");
	}
}

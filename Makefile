# Simple Makefile for Whac-a-Mole Serial Controller
# Works on macOS and Linux

# Default target
.DEFAULT_GOAL := run

.PHONY: run
run: ## Start debug server (prints all logs to terminal)
	@node server.js

.PHONY: install
install: ## Install dependencies
	@npm install

.PHONY: help
help: ## Show this help
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-10s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: clean
clean: ## Clean dependencies
	@rm -rf node_modules package-lock.json
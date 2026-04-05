.PHONY: build deploy teardown dev

build: ## Build all three app images into minikube's docker daemon
	eval $$(minikube docker-env) && \
	docker build -t edu-oe/backend-ts:latest -f apps/backend-ts/Dockerfile . && \
	docker build -t edu-oe/backend-py:latest apps/backend-py && \
	docker build -t edu-oe/frontend:latest -f apps/frontend/Dockerfile .

deploy: ## Apply all k8s manifests
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/

teardown: ## Remove all k8s resources
	kubectl delete -f k8s/

dev: ## Local dev (docker-compose infra + pnpm dev)
	docker compose up -d && pnpm dev

PLUGIN_NAME = gitops-enhanced
NAMESPACE = gitops-enhanced-plugin
IMAGE = image-registry.openshift-image-registry.svc:5000/$(NAMESPACE)/$(PLUGIN_NAME)-plugin:latest

.PHONY: install test build lint image deploy undeploy rollout clean

install:
	npm ci

test:
	npx jest

lint:
	npx tsc --noEmit

build: install
	NODE_ENV=production npx webpack --config webpack.config.ts

image:
	oc start-build $(PLUGIN_NAME)-plugin --from-dir=. --follow -n $(NAMESPACE)

deploy:
	helm upgrade -i $(PLUGIN_NAME) charts/gitops-enhanced-plugin/ \
		--set plugin.image=$(IMAGE) \
		-n $(NAMESPACE) --create-namespace
	oc patch consoles.operator.openshift.io cluster --type merge \
		-p '{"spec":{"plugins":["$(PLUGIN_NAME)"]}}'

undeploy:
	helm uninstall $(PLUGIN_NAME) -n $(NAMESPACE) || true
	oc patch consoles.operator.openshift.io cluster --type json \
		-p '[{"op":"remove","path":"/spec/plugins","value":["$(PLUGIN_NAME)"]}]' || true

rollout:
	oc rollout restart deployment/$(PLUGIN_NAME) -n $(NAMESPACE)

clean:
	rm -rf dist node_modules

# Full deploy pipeline: build image on cluster, deploy helm, restart pods
ship: image deploy rollout
	@echo "Plugin deployed and enabled. Refresh the console."

.PHONY: run publish

# Start the local development server.
run:
	npm run dev

# Build and upload using the project's existing RUN deployment command.
publish:
	npm run deploy

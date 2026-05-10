"use strict";
// Provider system - unified interface for AI providers
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderError = exports.Provider = void 0;
class Provider {
    constructor(config) {
        this.config = config;
    }
    // Optional: streaming implementation
    async *stream(messages, options) {
        throw new Error("Streaming not implemented for this provider");
    }
}
exports.Provider = Provider;
class ProviderError extends Error {
    constructor(message, provider, statusCode, originalError) {
        super(message);
        this.provider = provider;
        this.statusCode = statusCode;
        this.originalError = originalError;
        this.name = "ProviderError";
    }
}
exports.ProviderError = ProviderError;

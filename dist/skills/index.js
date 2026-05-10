"use strict";
// Skills system - plugin architecture for extensible capabilities
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillManager = void 0;
class SkillManager {
    constructor(customSkillsPath) {
        this.skills = new Map();
        this.customSkillsPath = customSkillsPath;
    }
    register(skill) {
        this.skills.set(skill.name, skill);
    }
    unregister(name) {
        this.skills.delete(name);
    }
    get(name) {
        return this.skills.get(name);
    }
    getAll() {
        return Array.from(this.skills.values());
    }
    findByTrigger(input) {
        for (const skill of this.skills.values()) {
            if (typeof skill.trigger === "string") {
                if (input.startsWith(skill.trigger))
                    return skill;
            }
            else if (skill.trigger instanceof RegExp) {
                if (skill.trigger.test(input))
                    return skill;
            }
        }
        return undefined;
    }
    async execute(skillName, context) {
        const skill = this.skills.get(skillName);
        if (!skill) {
            return {
                success: false,
                message: `Skill '${skillName}' not found`,
                error: "SKILL_NOT_FOUND",
            };
        }
        try {
            return await skill.execute(context);
        }
        catch (error) {
            return {
                success: false,
                message: `Skill execution failed: ${error instanceof Error ? error.message : String(error)}`,
                error: String(error),
            };
        }
    }
    async loadCustomSkills() {
        const fs = await Promise.resolve().then(() => __importStar(require("fs")));
        const path = await Promise.resolve().then(() => __importStar(require("path")));
        const errors = [];
        let loaded = 0;
        try {
            if (!fs.existsSync(this.customSkillsPath)) {
                fs.mkdirSync(this.customSkillsPath, { recursive: true });
                return { loaded: 0, errors: [] };
            }
            const files = fs.readdirSync(this.customSkillsPath);
            for (const file of files) {
                if (!file.endsWith(".js") && !file.endsWith(".ts"))
                    continue;
                try {
                    const fullPath = path.join(this.customSkillsPath, file);
                    const skillModule = require(fullPath);
                    const skill = skillModule.default || skillModule;
                    if (this.validateSkill(skill)) {
                        this.register(skill);
                        loaded++;
                    }
                    else {
                        errors.push(`${file}: Invalid skill structure`);
                    }
                }
                catch (error) {
                    errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        catch (error) {
            errors.push(`Failed to load custom skills: ${error instanceof Error ? error.message : String(error)}`);
        }
        return { loaded, errors };
    }
    validateSkill(skill) {
        return (skill &&
            typeof skill.name === "string" &&
            typeof skill.description === "string" &&
            (typeof skill.trigger === "string" || skill.trigger instanceof RegExp) &&
            typeof skill.execute === "function");
    }
}
exports.SkillManager = SkillManager;

"use strict";
// Planning mode - automatic task analysis and structured planning
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
class Planner {
    constructor() {
        this.currentPlan = null;
    }
    analyzeTask(input, context) {
        const indicators = {
            multiFile: /multiple files|several files|across files/i.test(input),
            architectural: /architecture|design|refactor|restructure/i.test(input),
            complex: /complex|difficult|challenging/i.test(input),
            unclear: /how to|what's the best|should i|which way/i.test(input),
            explicitPlan: /plan|design|think about|analyze/i.test(input),
            multiStep: input.split(/and|then|after|also/).length > 3,
        };
        const complexityScore = (indicators.multiFile ? 2 : 0) +
            (indicators.architectural ? 3 : 0) +
            (indicators.complex ? 2 : 0) +
            (indicators.unclear ? 1 : 0) +
            (indicators.explicitPlan ? 1 : 0) +
            (indicators.multiStep ? 2 : 0);
        let complexity;
        let requiresPlanning;
        if (complexityScore >= 5) {
            complexity = "complex";
            requiresPlanning = true;
        }
        else if (complexityScore >= 3) {
            complexity = "medium";
            requiresPlanning = true;
        }
        else {
            complexity = "simple";
            requiresPlanning = false;
        }
        // Suggest relevant skills
        const suggestedSkills = [];
        if (/git|commit|branch|merge/i.test(input))
            suggestedSkills.push("git");
        if (/test|spec|coverage/i.test(input))
            suggestedSkills.push("test");
        if (/review|check|analyze code/i.test(input))
            suggestedSkills.push("review");
        if (/refactor|clean|improve/i.test(input))
            suggestedSkills.push("refactor");
        if (/document|readme|comment/i.test(input))
            suggestedSkills.push("docs");
        if (/search|fetch|scrape|web/i.test(input))
            suggestedSkills.push("web");
        return {
            complexity,
            requiresPlanning,
            suggestedSkills,
            estimatedSteps: Math.max(1, Math.ceil(complexityScore / 2)),
            reasoning: this.explainAnalysis(indicators, complexity),
        };
    }
    explainAnalysis(indicators, complexity) {
        const reasons = [];
        if (indicators.multiFile)
            reasons.push("affects multiple files");
        if (indicators.architectural)
            reasons.push("involves architectural decisions");
        if (indicators.complex)
            reasons.push("explicitly marked as complex");
        if (indicators.unclear)
            reasons.push("requirements need clarification");
        if (indicators.multiStep)
            reasons.push("requires multiple steps");
        return reasons.length > 0
            ? `Task is ${complexity} because it ${reasons.join(", ")}`
            : `Task appears ${complexity} based on initial analysis`;
    }
    createPlan(task, analysis) {
        const plan = {
            id: `plan-${Date.now()}`,
            task,
            analysis: analysis.reasoning,
            steps: [],
            files: [],
            estimatedComplexity: analysis.complexity,
            status: "draft",
            createdAt: new Date().toISOString(),
        };
        this.currentPlan = plan;
        return plan;
    }
    addStep(step) {
        if (!this.currentPlan)
            throw new Error("No active plan");
        this.currentPlan.steps.push({
            ...step,
            id: `step-${this.currentPlan.steps.length + 1}`,
            status: "pending",
        });
    }
    updateStepStatus(stepId, status, result, error) {
        if (!this.currentPlan)
            throw new Error("No active plan");
        const step = this.currentPlan.steps.find(s => s.id === stepId);
        if (!step)
            throw new Error(`Step ${stepId} not found`);
        step.status = status;
        if (result)
            step.result = result;
        if (error)
            step.error = error;
    }
    getCurrentPlan() {
        return this.currentPlan;
    }
    approvePlan() {
        if (!this.currentPlan)
            throw new Error("No active plan");
        this.currentPlan.status = "approved";
    }
    startExecution() {
        if (!this.currentPlan)
            throw new Error("No active plan");
        if (this.currentPlan.status !== "approved") {
            throw new Error("Plan must be approved before execution");
        }
        this.currentPlan.status = "executing";
    }
    completePlan(success) {
        if (!this.currentPlan)
            throw new Error("No active plan");
        this.currentPlan.status = success ? "completed" : "failed";
    }
    clearPlan() {
        this.currentPlan = null;
    }
    formatPlan(plan, colors) {
        const lines = [];
        const { cyan, white, gray, green, yellow, red, purple, R, B } = colors;
        lines.push(`\n  ${cyan}╭─${R} ${B}${white}Plan: ${plan.task}${R}`);
        lines.push(`  ${cyan}│${R}`);
        lines.push(`  ${cyan}│${R}  ${gray}Complexity:${R} ${this.getComplexityColor(plan.estimatedComplexity, colors)}${plan.estimatedComplexity}${R}`);
        lines.push(`  ${cyan}│${R}  ${gray}Steps:${R} ${purple}${plan.steps.length}${R}`);
        lines.push(`  ${cyan}│${R}  ${gray}Status:${R} ${this.getStatusColor(plan.status, colors)}${plan.status}${R}`);
        lines.push(`  ${cyan}│${R}`);
        if (plan.analysis) {
            lines.push(`  ${cyan}│${R}  ${gray}Analysis:${R}`);
            lines.push(`  ${cyan}│${R}  ${plan.analysis}`);
            lines.push(`  ${cyan}│${R}`);
        }
        lines.push(`  ${cyan}│${R}  ${B}${white}Steps:${R}`);
        for (const step of plan.steps) {
            const icon = this.getStepIcon(step.status);
            const statusColor = this.getStatusColor(step.status, colors);
            lines.push(`  ${cyan}│${R}  ${icon} ${statusColor}${step.description}${R}`);
            if (step.files && step.files.length > 0) {
                lines.push(`  ${cyan}│${R}     ${gray}Files: ${step.files.join(", ")}${R}`);
            }
            if (step.error) {
                lines.push(`  ${cyan}│${R}     ${red}Error: ${step.error}${R}`);
            }
        }
        lines.push(`  ${cyan}╰${"─".repeat(60)}${R}\n`);
        return lines.join("\n");
    }
    getComplexityColor(complexity, colors) {
        switch (complexity) {
            case "simple": return colors.green;
            case "medium": return colors.yellow;
            case "complex": return colors.red;
            default: return colors.gray;
        }
    }
    getStatusColor(status, colors) {
        switch (status) {
            case "completed":
            case "approved": return colors.green;
            case "in_progress":
            case "executing": return colors.yellow;
            case "failed": return colors.red;
            case "pending":
            case "draft": return colors.gray;
            default: return colors.gray;
        }
    }
    getStepIcon(status) {
        switch (status) {
            case "completed": return "✓";
            case "in_progress": return "⋯";
            case "failed": return "✗";
            case "skipped": return "○";
            case "pending": return "○";
            default: return "○";
        }
    }
}
exports.Planner = Planner;

"use strict";
// Task management system - track progress and organize work
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskManager = void 0;
class TaskManager {
    constructor() {
        this.tasks = new Map();
        this.nextId = 1;
    }
    create(data) {
        const task = {
            id: String(this.nextId++),
            subject: data.subject,
            description: data.description,
            activeForm: data.activeForm,
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: data.metadata,
        };
        this.tasks.set(task.id, task);
        return task;
    }
    get(id) {
        return this.tasks.get(id);
    }
    list() {
        return Array.from(this.tasks.values()).sort((a, b) => {
            // Sort by status priority, then by ID
            const statusOrder = { pending: 0, in_progress: 1, blocked: 2, completed: 3, failed: 4 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            return statusDiff !== 0 ? statusDiff : parseInt(a.id) - parseInt(b.id);
        });
    }
    update(id, updates) {
        const task = this.tasks.get(id);
        if (!task)
            return false;
        Object.assign(task, updates, {
            updatedAt: new Date().toISOString(),
        });
        return true;
    }
    delete(id) {
        return this.tasks.delete(id);
    }
    // Update task status
    setStatus(id, status) {
        return this.update(id, { status });
    }
    // Add blocking relationships
    addBlocks(taskId, blocksIds) {
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        task.blocks = [...(task.blocks || []), ...blocksIds];
        // Update blocked tasks
        for (const blockedId of blocksIds) {
            const blocked = this.tasks.get(blockedId);
            if (blocked) {
                blocked.blockedBy = [...(blocked.blockedBy || []), taskId];
            }
        }
        return true;
    }
    // Get available tasks (not blocked, not completed)
    getAvailable() {
        return this.list().filter(t => t.status === "pending" &&
            (!t.blockedBy || t.blockedBy.length === 0));
    }
    // Get tasks by status
    getByStatus(status) {
        return this.list().filter(t => t.status === status);
    }
    // Clear all tasks
    clear() {
        this.tasks.clear();
        this.nextId = 1;
    }
    // Format task list for display
    format(colors) {
        const tasks = this.list();
        if (tasks.length === 0)
            return "No tasks";
        const lines = [];
        const { cyan, white, gray, green, yellow, red, purple, orange, R, B } = colors;
        lines.push(`\n  ${cyan}╭─${R} ${B}${white}Tasks${R} ${gray}(${tasks.length})${R}`);
        for (const task of tasks) {
            const icon = this.getStatusIcon(task.status);
            const statusColor = this.getStatusColor(task.status, colors);
            lines.push(`  ${cyan}│${R}`);
            lines.push(`  ${cyan}│${R}  ${icon} ${B}${task.id}${R} ${statusColor}${task.subject}${R}`);
            if (task.description && task.description !== task.subject) {
                lines.push(`  ${cyan}│${R}     ${gray}${task.description.slice(0, 60)}${R}`);
            }
            if (task.blockedBy && task.blockedBy.length > 0) {
                lines.push(`  ${cyan}│${R}     ${red}Blocked by: ${task.blockedBy.join(", ")}${R}`);
            }
        }
        lines.push(`  ${cyan}╰${"─".repeat(60)}${R}\n`);
        return lines.join("\n");
    }
    getStatusIcon(status) {
        switch (status) {
            case "completed": return "✓";
            case "in_progress": return "⋯";
            case "failed": return "✗";
            case "blocked": return "⊗";
            case "pending": return "○";
            default: return "○";
        }
    }
    getStatusColor(status, colors) {
        switch (status) {
            case "completed": return colors.green;
            case "in_progress": return colors.yellow;
            case "failed": return colors.red;
            case "blocked": return colors.orange;
            case "pending": return colors.gray;
            default: return colors.gray;
        }
    }
}
exports.TaskManager = TaskManager;

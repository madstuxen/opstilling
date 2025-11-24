class CoachEngine {
    constructor(sessionData, variables) {
        this.nodes = sessionData.nodes;
        this.startNode = sessionData.start_node;
        this.blackboard = variables;
        this.currentNodeId = null;
        this.questionIndex = 0;
        this.preparedQuestions = [];
    }
    
    start() {
        this.currentNodeId = this.startNode;
        return this.processCurrentNode();
    }
    
    processCurrentNode() {
        const node = this.nodes.find(n => n.id === this.currentNodeId);
        if (!node) return { text: 'Fejl: Node ikke fundet', done: true };
        
        if (node.type === 'all') {
            return this.handleLoop(node);
        } else if (node.type === 'pick') {
            return this.handlePool(node);
        } else if (node.type === 'random') {
            return this.handleRandLoop(node);
        } else if (node.type === 'choice') {
            return this.handleChoice(node);
        } else if (node.type === 'save') {
            return this.handleSave(node);
        } else if (node.type === 'branch') {
            return this.handleBranch(node);
        }
    }
    
    handleLoop(node) {
        // Item loop
        if (node.items) {
            // Check if items is a variable name or array
            const itemsList = Array.isArray(node.items) ? node.items : this.blackboard[node.items] || [];
            
            if (itemsList.length > 0 && this.questionIndex === 0) {
                this.preparedQuestions = [];
                for (let item of itemsList) {
                    for (let q of node.questions) {
                        // Detect <<m>> marker
                        const hasM = typeof q === 'string' && q.includes('<<m>>');
                        const cleanQ = typeof q === 'string' ? q.replace(/<<m>>/g, '') : q;
                        this.preparedQuestions.push({ text: cleanQ, item: item, mmm: hasM });
                    }
                }
            }
            
            if (this.questionIndex < this.preparedQuestions.length) {
                const q = this.preparedQuestions[this.questionIndex];
                this.blackboard.item = q.item;
                return { text: this.replaceVars(q.text), done: false, mmm: !!q.mmm };
            } else {
                return this.moveToNext(node.next);
            }
        }
        
        // Regular loop
        if (this.questionIndex < node.questions.length) {
            const raw = node.questions[this.questionIndex];
            const hasM = typeof raw === 'string' && raw.includes('<<m>>');
            const clean = typeof raw === 'string' ? raw.replace(/<<m>>/g, '') : raw;
            return { text: this.replaceVars(clean), done: false, mmm: hasM };
        } else {
            return this.moveToNext(node.next);
        }
    }
    
    handlePool(node) {
        if (this.questionIndex === 0) {
            // Check if we have items to loop over
            const itemsList = node.items ? (Array.isArray(node.items) ? node.items : this.blackboard[node.items] || []) : [];
            
            if (itemsList.length > 0) {
                // Pick random item
                const randomItem = itemsList[Math.floor(Math.random() * itemsList.length)];
                this.blackboard.item = randomItem;
            }
            
            // Pick random question
            const pickedQ = node.questions[Math.floor(Math.random() * node.questions.length)];
            const hasM = typeof pickedQ === 'string' && pickedQ.includes('<<m>>');
            const randomQ = typeof pickedQ === 'string' ? pickedQ.replace(/<<m>>/g, '') : pickedQ;
            this.questionIndex++;
            return { text: this.replaceVars(randomQ), done: false, mmm: hasM };
        } else {
            delete this.blackboard.item;
            return this.moveToNext(node.next);
        }
    }
    
    handleRandLoop(node) {
        if (this.questionIndex === 0) {
            // Check if we have items
            const itemsList = node.items ? (Array.isArray(node.items) ? node.items : this.blackboard[node.items] || []) : [];
            
            if (itemsList.length > 0) {
                // Pick random items
                const shuffledItems = [...itemsList].sort(() => Math.random() - 0.5);
                const selectedItems = shuffledItems.slice(0, Math.min(node.count || 2, itemsList.length));
                
                // For each selected item, pick random questions
                this.preparedQuestions = [];
                for (let item of selectedItems) {
                    const shuffled = [...node.questions].sort(() => Math.random() - 0.5);
                    for (let q of shuffled) {
                        const hasM = typeof q === 'string' && q.includes('<<m>>');
                        const cleanQ = typeof q === 'string' ? q.replace(/<<m>>/g, '') : q;
                        this.preparedQuestions.push({ text: cleanQ, item: item, mmm: hasM });
                    }
                }
            } else {
                // No items, just pick random questions
                const shuffled = [...node.questions].sort(() => Math.random() - 0.5);
                this.preparedQuestions = shuffled.slice(0, node.count || 2).map(q => ({
                    text: (typeof q === 'string' ? q.replace(/<<m>>/g, '') : q),
                    mmm: (typeof q === 'string' && q.includes('<<m>>'))
                }));
            }
        }
        
        if (this.questionIndex < this.preparedQuestions.length) {
            const q = this.preparedQuestions[this.questionIndex];
            if (q.item) this.blackboard.item = q.item;
            return { text: this.replaceVars(q.text), done: false, mmm: !!q.mmm };
        } else {
            delete this.blackboard.item;
            return this.moveToNext(node.next);
        }
    }
    
    handleChoice(node) {
        if (this.questionIndex === 0) {
            // Parse question to find variable name in <<...>>
            const match = node.question.match(/<<([^>]+)>>/);
            const variableName = match ? match[1] : 'choice';
            
            this.questionIndex++;
            
            // Check if it's a slider or buttons
            if (node.input_type === 'slider') {
                return {
                    text: this.replaceVars(node.question),
                    type: 'slider',
                    min: node.min !== undefined ? node.min : 0,
                    max: node.max !== undefined ? node.max : 100,
                    step: node.step !== undefined ? node.step : 1,
                    labels: this.processLabels(node.labels) || null,
                    variableName: variableName,
                    done: false
                };
            } else {
                // Buttons (default)
                let choicesList = [];
                
                if (node.items) {
                    if (Array.isArray(node.items)) {
                        // Already an array
                        choicesList = node.items;
                    } else if (typeof node.items === 'string') {
                        // Check if it contains {{variables}}
                        if (node.items.includes('{{')) {
                            // Replace variables and split
                            const replaced = this.replaceVars(node.items);
                            choicesList = replaced.split(',').map(s => s.trim()).filter(s => s);
                        } else {
                            // Variable name reference
                            choicesList = this.blackboard[node.items] || [];
                        }
                    }
                }
                
                return {
                    text: this.replaceVars(node.question),
                    type: 'choice',
                    choices: choicesList,
                    variableName: variableName,
                    done: false
                };
            }
        } else {
            return this.moveToNext(node.next);
        }
    }
    
    handleSave(node) {
        if (this.questionIndex === 0) {
            this.questionIndex++;
            return {
                text: this.replaceVars(node.question),
                type: 'save',
                saveAs: node.save_as,
                done: false
            };
        } else {
            return this.moveToNext(node.next);
        }
    }
    
    handleBranch(node) {
        // Parse and evaluate branch rules
        if (!node.rules) {
            return this.moveToNext(node.next);
        }
        
        const lines = node.rules.split('\n').map(l => l.trim()).filter(l => l);
        let nextNode = null;
        
        let currentIfMatched = null; // null = no active if, true = matched, false = didn't match

        for (let line of lines) {
            // Handle 'else'
            if (line.startsWith('else')) {
                // Only run else if current if didn't match
                if (currentIfMatched === false) {
                    const actions = line.substring(line.indexOf('->') + 2).trim();
                    this.executeActions(actions);
                    
                    if (this.pendingNext) {
                        if (typeof updateTestVariables === 'function') updateTestVariables();
                        return this.moveToNext(this.pendingNext);
                    }
                }
                // Reset for next if/else group
                currentIfMatched = null;
                continue;
            }
            
            // Parse 'if condition -> actions'
            if (line.startsWith('if ')) {
                // New if statement starts a new group
                currentIfMatched = null;
                
                const arrowPos = line.indexOf('->');
                if (arrowPos === -1) continue;
                
                const conditionPart = line.substring(3, arrowPos).trim();
                const actionsPart = line.substring(arrowPos + 2).trim();
                
                // Evaluate condition
                if (this.evaluateCondition(conditionPart)) {
                    this.executeActions(actionsPart);
                    currentIfMatched = true;
                    
                    // Stop if we hit a next: action
                    if (this.pendingNext) {
                        if (typeof updateTestVariables === 'function') updateTestVariables();
                        return this.moveToNext(this.pendingNext);
                    }

                    // Check if next line is 'else' for this if
                    const currentLineIndex = lines.indexOf(line);
                    const nextLine = lines[currentLineIndex + 1];
                    if (!nextLine || !nextLine.trim().startsWith('else')) {
                        // No else follows, so we're done with this if statement
                        // Continue to next line (don't break)
                        continue;
                    }
                    // Otherwise continue to check the else
                } else {
                    currentIfMatched = false;
                }
            }
        }
        
        // No next: found, use default
        if (typeof updateTestVariables === 'function') updateTestVariables();
        return this.moveToNext(node.next);
    }

    evaluateCondition(condition) {
        // Replace {{variables}} with values
        const replaced = condition.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
            return this.evaluateExpression(expr);
        });
        
        // Handle logical operators (&&, ||)
        if (replaced.includes('&&')) {
            const parts = replaced.split('&&').map(p => p.trim());
            return parts.every(part => this.evaluateSimpleCondition(part));
        }
        
        if (replaced.includes('||')) {
            const parts = replaced.split('||').map(p => p.trim());
            return parts.some(part => this.evaluateSimpleCondition(part));
        }
        
        return this.evaluateSimpleCondition(replaced);
    }

    evaluateSimpleCondition(condition) {
        // Parse: leftValue operator rightValue
        const operators = ['==', '!=', '>=', '<=', '>', '<'];
        
        for (let op of operators) {
            if (condition.includes(op)) {
                const parts = condition.split(op).map(p => p.trim());
                if (parts.length !== 2) continue;
                
                const left = this.parseValue(parts[0]);
                const right = this.parseValue(parts[1]);
                
                switch(op) {
                    case '==': return left == right;
                    case '!=': return left != right;
                    case '>': return Number(left) > Number(right);
                    case '<': return Number(left) < Number(right);
                    case '>=': return Number(left) >= Number(right);
                    case '<=': return Number(left) <= Number(right);
                }
            }
        }
        
        return false;
    }

    evaluateExpression(expr) {
        // Handle arithmetic: a + b, a - b, etc.
        expr = expr.trim();
        
        // Use regex to find operators that are surrounded by spaces or at boundaries
        const opRegex = /\s*([\+\-\*\/])\s*/;
        const match = expr.match(opRegex);
        
        if (match) {
            const op = match[1];
            const parts = expr.split(opRegex).filter(p => p && !p.match(/^[\+\-\*\/]$/));
            
            if (parts.length >= 2) {
                const left = this.getVariableValue(parts[0].trim());
                const right = this.getVariableValue(parts[1].trim());
                
                switch(op) {
                    case '+': return Number(left) + Number(right);
                    case '-': return Number(left) - Number(right);
                    case '*': return Number(left) * Number(right);
                    case '/': return Number(left) / Number(right);
                }
            }
        }
        
        // Just a variable reference
        return this.getVariableValue(expr);
    }

    getVariableValue(name) {
        name = name.trim();
        
        // Check if it's a number (including 0)
        if (!isNaN(name) && name !== '') return Number(name);
        
        // Check if it's a string literal
        if (name.startsWith('"') && name.endsWith('"')) {
            return name.slice(1, -1);
        }
        
        // It's a variable name
        return this.blackboard[name];
    }

    parseValue(value) {
        value = value.trim();
        
        // Number literal
        if (!isNaN(value)) return Number(value);
        
        // String literal
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1);
        }
        
        // Already evaluated
        return value;
    }

    executeActions(actions) {
        this.pendingNext = null;
        
        // Find next: if present
        const nextMatch = actions.match(/next:(\S+)/);
        if (nextMatch) {
            this.pendingNext = nextMatch[1];
        }
        
        // Find set: if present
        const setMatch = actions.match(/set:(.+?)(?:\s+next:|$)/);
        if (setMatch) {
            const setStatements = setMatch[1].trim();
            this.executeSetStatements(setStatements);
        }
    }

    executeSetStatements(statements) {
        // Split by comma for multiple assignments
        const assignments = statements.split(',').map(s => s.trim());
        
        for (let assignment of assignments) {
            // Check for +=, -=, *=, /=
            for (let op of ['+=', '-=', '*=', '/=']) {
                if (assignment.includes(op)) {
                    const parts = assignment.split(op).map(p => p.trim());
                    // Strip both <<>> and {{}} from variable name
                    const varName = parts[0].replace(/[<>{}]/g, '').trim();
                    const value = this.evaluateRightSide(parts[1]);
                    
                    const currentValue = this.blackboard[varName] || 0;
                    
                    switch(op) {
                        case '+=': this.blackboard[varName] = Number(currentValue) + Number(value); break;
                        case '-=': this.blackboard[varName] = Number(currentValue) - Number(value); break;
                        case '*=': this.blackboard[varName] = Number(currentValue) * Number(value); break;
                        case '/=': this.blackboard[varName] = Number(currentValue) / Number(value); break;
                    }
                    return;
                }
            }
            
            // Regular assignment: var=value
            if (assignment.includes('=')) {
                const parts = assignment.split('=');
                // Strip both <<>> and {{}} from variable name
                const varName = parts[0].trim().replace(/[<>{}]/g, '').trim();
                const value = this.evaluateRightSide(parts.slice(1).join('=').trim());
                
                this.blackboard[varName] = value;
            }
        }
    }

    evaluateRightSide(right) {
        right = right.trim();
        
        // Handle {{expressions}} - replace ALL of them
        const replaced = right.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
            const result = this.evaluateExpression(expr);
            return result !== undefined ? result : match;
        });
        
        // If we replaced everything and it's now just a value, return it
        if (!replaced.includes('{{')) {
            // String literal
            if (replaced.startsWith('"') && replaced.endsWith('"')) {
                return replaced.slice(1, -1);
            }
            
            // Number
            if (!isNaN(replaced)) return Number(replaced);
            
            // Try to evaluate as arithmetic expression if it contains operators
            if (replaced.includes('+') || replaced.includes('-') || replaced.includes('*') || replaced.includes('/')) {
                try {
                    // Handle double negatives like "0 - -34" -> "0 - (-34)"
                    const cleanedExpr = replaced.replace(/(\d+)\s*-\s*-(\d+)/g, '$1 - (-$2)');
                    return eval(cleanedExpr);
                } catch (e) {
                    // If eval fails, return the original
                    return replaced;
                }
            }
            
            // Pure value after replacement
            return replaced;
        }
        
        // String literal
        if (right.startsWith('"') && right.endsWith('"')) {
            return right.slice(1, -1);
        }
        
        // Number
        if (!isNaN(right)) return Number(right);
        
        // Variable reference (without {{}})
        return this.blackboard[right] || right;
    }
    
    moveToNext(nextId) {
        if (!nextId) {
            return { done: true };
        }
        this.currentNodeId = nextId;
        this.questionIndex = 0;
        this.preparedQuestions = [];
        return this.processCurrentNode();
    }
    
    isLastQuestion() {
        // Check if current question is the last one
        // Simple logic: if next is empty (undefined, null, or empty string), it's the last question
        // This works even with branching - if next is empty, there's nowhere to go
        const node = this.nodes.find(n => n.id === this.currentNodeId);
        if (!node) return true;
        
        // Helper to check if next is empty (matches moveToNext logic: !nextId)
        // This checks for undefined, null, empty string, or any falsy value
        const isNextEmpty = (next) => {
            return !next;
        };
        
        // Check if there are more questions in current node
        if (node.type === 'all') {
            if (node.items) {
                const itemsList = Array.isArray(node.items) ? node.items : this.blackboard[node.items] || [];
                if (itemsList.length > 0) {
                    // Calculate total questions without modifying state
                    const totalQuestions = itemsList.length * node.questions.length;
                    // Use preparedQuestions if already calculated, otherwise use calculated total
                    const currentTotal = this.preparedQuestions.length > 0 ? this.preparedQuestions.length : totalQuestions;
                    // questionIndex is the index of the CURRENT question being shown
                    // So if questionIndex is 6 and totalQuestions is 7, we're showing the last question (index 6)
                    const hasMoreInNode = this.questionIndex < currentTotal - 1;
                    // If there are more questions in this node, it's not the last
                    if (hasMoreInNode) return false;
                    // If no more questions in node, check if next is empty
                    return isNextEmpty(node.next);
                }
            }
            // Regular loop without items
            // questionIndex is the index of the CURRENT question being shown
            // So if questionIndex is 6 and length is 7, we're showing the last question (index 6)
            const hasMoreInNode = this.questionIndex < node.questions.length - 1;
            // If there are more questions in this node, it's not the last
            if (hasMoreInNode) return false;
            // If no more questions in node, check if next is empty
            return isNextEmpty(node.next);
        } else if (node.type === 'pick') {
            // Pick type only shows one question, so check if next is empty
            return isNextEmpty(node.next);
        } else if (node.type === 'random') {
            // Random type can have multiple questions in preparedQuestions
            // If preparedQuestions is not initialized yet, we can't determine, so check next
            if (this.preparedQuestions.length === 0) {
                return isNextEmpty(node.next);
            }
            const hasMoreInNode = this.questionIndex < this.preparedQuestions.length - 1;
            // If there are more questions in this node, it's not the last
            if (hasMoreInNode) return false;
            // If no more questions in node, check if next is empty
            return isNextEmpty(node.next);
        } else if (node.type === 'choice' || node.type === 'save') {
            // These types only show one question, so check if next is empty
            return isNextEmpty(node.next);
        } else if (node.type === 'branch') {
            // Branch nodes might have conditional next, so we can't easily determine
            // But if next is empty, it's likely the last
            return isNextEmpty(node.next);
        }
        
        return isNextEmpty(node.next);
    }
    
    isLastQuestionInLastNode() {
        // Check if current question is the last question in the last node
        // This is used to determine if we should hide the arrow for <<m>> questions
        const node = this.nodes.find(n => n.id === this.currentNodeId);
        if (!node) return true;
        
        // Helper to check if next is empty (matches moveToNext logic: !nextId)
        const isNextEmpty = (next) => {
            return !next;
        };
        
        // First check if this is the last node (next is empty)
        if (!isNextEmpty(node.next)) {
            return false; // Not the last node
        }
        
        // Now check if this is the last question in this node
        if (node.type === 'all') {
            if (node.items) {
                const itemsList = Array.isArray(node.items) ? node.items : this.blackboard[node.items] || [];
                if (itemsList.length > 0) {
                    const totalQuestions = itemsList.length * node.questions.length;
                    const currentTotal = this.preparedQuestions.length > 0 ? this.preparedQuestions.length : totalQuestions;
                    // Check if this is the last question in the node
                    return this.questionIndex === currentTotal - 1;
                }
            }
            // Regular loop without items
            // Check if this is the last question in the node
            return this.questionIndex === node.questions.length - 1;
        } else if (node.type === 'pick' || node.type === 'random' || node.type === 'choice' || node.type === 'save') {
            // These types only show one question, so if we're here and next is empty, it's the last
            return true;
        } else if (node.type === 'branch') {
            // Branch nodes might have conditional next, but if next is empty, it's the last
            return true;
        }
        
        return false;
    }
    
    answer(response) {
        this.questionIndex++;
        return this.processCurrentNode();
    }
    
    replaceVars(text) {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const value = this.blackboard[key];
            if (value === undefined) return match;
            
            // If it's an array, format it nicely
            if (Array.isArray(value)) {
                if (value.length === 0) return '';
                if (value.length === 1) return value[0];
                if (value.length === 2) return value[0] + ' og ' + value[1];
                // 3 or more: "a, b, c og d"
                const last = value[value.length - 1];
                const rest = value.slice(0, -1);
                return rest.join(', ') + ' og ' + last;
            }
            
            return value;
        });
    }
    
    processLabels(labels) {
        if (!labels || labels.length === 0) return null;
        
        // If it's a single item (variable name)
        if (labels.length === 1) {
            const labelText = labels[0].trim();
            
            // Check if it contains {{}} - then it will be replaced later
            if (labelText.includes('{{')) {
                return labels;
            }
            
            // Otherwise treat as variable name
            const value = this.blackboard[labelText];
            if (Array.isArray(value) && value.length >= 2) {
                return [value[0], value[1]];
            }
            
            // Single value or not found
            return labels;
        }
        
        // Multiple items like ["{{left}}", "{{right}}"] or ["Introvert", "Ekstrovert"]
        return labels;
    }
}

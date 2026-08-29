/**
 * Agent Implementations for Two-Room Vacuum Robot Demo
 * 1. Table-Driven Agent (Action = TABLE[Percept History])
 * 2. Simple Reflex Agent (Condition-Action Rules on Current Percept, Memory = None)
 * 3. Model-Based Reflex Agent (Percept + Internal State Model -> Updated Model -> Rule -> Action)
 */

/**
 * 1. Table-Driven Agent
 * Maintains the full history of percepts and performs a table lookup.
 */
class TableDrivenAgent {
  constructor() {
    this.name = 'Table-Driven Agent';
    this.decisionBasis = 'Percept History';
    this.memoryType = 'Full History / Table Lookup';
    this.perceptHistory = [];
    this.table = this.buildLookupTable();
  }

  reset() {
    this.perceptHistory = [];
  }

  /**
   * Helper to format percept sequence as a lookup key
   */
  static historyToKey(history) {
    return history.map(p => `(${p.location},${p.status})`).join(' -> ');
  }

  /**
   * Pre-computed lookup table for teaching demonstration.
   * Covers standard paths from all 8 initial configurations.
   */
  buildLookupTable() {
    return {
      // --- Initial: (A, Dirty, Dirty) ---
      "[(A,Dirty)]": "Suck",
      "[(A,Dirty), (A,Clean)]": "Right",
      "[(A,Dirty), (A,Clean), (B,Dirty)]": "Suck",
      "[(A,Dirty), (A,Clean), (B,Dirty), (B,Clean)]": "NoOp",

      // --- Initial: (A, Dirty, Clean) ---
      "[(A,Dirty), (A,Clean), (B,Clean)]": "NoOp",

      // --- Initial: (A, Clean, Dirty) ---
      "[(A,Clean)]": "Right",
      "[(A,Clean), (B,Dirty)]": "Suck",
      "[(A,Clean), (B,Dirty), (B,Clean)]": "NoOp",

      // --- Initial: (A, Clean, Clean) ---
      "[(A,Clean), (B,Clean)]": "NoOp",

      // --- Initial: (B, Dirty, Dirty) ---
      "[(B,Dirty)]": "Suck",
      "[(B,Dirty), (B,Clean)]": "Left",
      "[(B,Dirty), (B,Clean), (A,Dirty)]": "Suck",
      "[(B,Dirty), (B,Clean), (A,Dirty), (A,Clean)]": "NoOp",

      // --- Initial: (B, Dirty, Clean) ---
      "[(B,Dirty), (B,Clean), (A,Clean)]": "NoOp",

      // --- Initial: (B, Clean, Dirty) ---
      "[(B,Clean)]": "Left",
      "[(B,Clean), (A,Dirty)]": "Suck",
      "[(B,Clean), (A,Dirty), (A,Clean)]": "NoOp",

      // --- Initial: (B, Clean, Clean) ---
      "[(B,Clean), (A,Clean)]": "NoOp"
    };
  }

  /**
   * Normalize key for flexible whitespace matching
   */
  formatKey(history) {
    return `[${history.map(p => `(${p.location},${p.status})`).join(', ')}]`;
  }

  /**
   * Choose action given current percept
   */
  decide(percept) {
    this.perceptHistory.push({ location: percept.location, status: percept.status });
    const key = this.formatKey(this.perceptHistory);
    
    // Look up action in table
    let action = this.table[key];
    let matchType = 'exact';

    if (!action) {
      // Fallback if sequence extends beyond pre-configured teaching table
      matchType = 'fallback';
      if (percept.status === 'Dirty') {
        action = 'Suck';
      } else {
        action = 'NoOp';
      }
    }

    return {
      agentType: 'Table-Driven',
      action: action,
      percept: percept.toString(),
      history: [...this.perceptHistory],
      historyKey: key,
      tableSize: Object.keys(this.table).length,
      historyLength: this.perceptHistory.length,
      matchType: matchType,
      explanation: `History (${this.perceptHistory.length} percepts) looked up in table: ${key} ⇒ ${action}`
    };
  }
}

/**
 * 2. Simple Reflex Agent
 * Chooses actions based strictly on the current percept, using condition-action rules.
 * No memory / internal state stored.
 */
class SimpleReflexAgent {
  constructor() {
    this.name = 'Simple Reflex Agent';
    this.decisionBasis = 'Current Percept Only';
    this.memoryType = 'None (0 bytes)';
  }

  reset() {
    // Stateless agent, nothing to reset
  }

  /**
   * Choose action given current percept
   */
  decide(percept) {
    let action = 'NoOp';
    let ruleMatched = '';
    let condition = '';

    if (percept.status === 'Dirty') {
      ruleMatched = 'IF Current Room is Dirty THEN Suck';
      condition = `percept.status == 'Dirty'`;
      action = 'Suck';
    } else if (percept.location === 'A') {
      ruleMatched = 'IF Current Room is Clean AND Location is A THEN Right';
      condition = `percept.status == 'Clean' && percept.location == 'A'`;
      action = 'Right';
    } else if (percept.location === 'B') {
      ruleMatched = 'IF Current Room is Clean AND Location is B THEN Left';
      condition = `percept.status == 'Clean' && percept.location == 'B'`;
      action = 'Left';
    }

    return {
      agentType: 'Simple Reflex',
      action: action,
      percept: percept.toString(),
      memory: 'None',
      ruleMatched: ruleMatched,
      condition: condition,
      explanation: `Observed ${percept.toString()}. Evaluated rule: ${ruleMatched} ⇒ ${action}. (Agent cannot remember whether the other room is clean!)`
    };
  }
}

/**
 * 3. Model-Based Reflex Agent
 * Maintains an internal model of the world (A Status, B Status).
 * Updates internal model with percepts and action results.
 * Can detect when both rooms are clean and choose NoOp to terminate.
 */
class ModelBasedReflexAgent {
  constructor() {
    this.name = 'Model-Based Reflex Agent';
    this.decisionBasis = 'Percept + Internal State Model';
    this.memoryType = 'Internal Model: { Room A, Room B }';
    this.reset();
  }

  reset() {
    this.internalState = {
      A: 'Unknown',
      B: 'Unknown'
    };
  }

  /**
   * Choose action given current percept
   */
  decide(percept) {
    const prevState = { ...this.internalState };

    // 1. Update internal state from current observation
    this.internalState[percept.location] = percept.status;

    let action = 'NoOp';
    let ruleMatched = '';
    let condition = '';

    // 2. Evaluate condition-action rules using percept + internal state model
    if (percept.status === 'Dirty') {
      ruleMatched = 'IF Current Room is Dirty THEN Suck';
      condition = `percept.status == 'Dirty'`;
      action = 'Suck';
      // Transition prediction: Sucking in current room will clean it
      this.internalState[percept.location] = 'Clean';
    } else if (this.internalState.A === 'Clean' && this.internalState.B === 'Clean') {
      ruleMatched = 'IF Room A is Clean AND Room B is Clean THEN NoOp';
      condition = `model.A == 'Clean' && model.B == 'Clean'`;
      action = 'NoOp';
    } else if (percept.location === 'A') {
      ruleMatched = 'IF Room A is Clean AND Room B != Clean THEN Right';
      condition = `location == 'A' && model.B != 'Clean'`;
      action = 'Right';
    } else if (percept.location === 'B') {
      ruleMatched = 'IF Room B is Clean AND Room A != Clean THEN Left';
      condition = `location == 'B' && model.A != 'Clean'`;
      action = 'Left';
    }

    const updatedState = { ...this.internalState };

    return {
      agentType: 'Model-Based Reflex',
      action: action,
      percept: percept.toString(),
      prevModel: prevState,
      updatedModel: updatedState,
      ruleMatched: ruleMatched,
      condition: condition,
      isFullyCleanKnown: (updatedState.A === 'Clean' && updatedState.B === 'Clean'),
      explanation: `Updated model to (A: ${updatedState.A}, B: ${updatedState.B}). Matched rule: "${ruleMatched}" ⇒ ${action}`
    };
  }
}

// Export to window
window.TableDrivenAgent = TableDrivenAgent;
window.SimpleReflexAgent = SimpleReflexAgent;
window.ModelBasedReflexAgent = ModelBasedReflexAgent;

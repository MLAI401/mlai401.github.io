/**
 * Two-Room Vacuum Robot Environment (AIMA Formulation)
 * State: (Robot Location ∈ {A, B}, Room A Status ∈ {Clean, Dirty}, Room B Status ∈ {Clean, Dirty})
 * Percept: (Current Location, Current Room Status)
 * Actions: Suck, Left, Right, NoOp
 * Performance Measure: Score = 10 * (rooms cleaned) - 1.5 * (Left/Right actions)
 */
class VacuumEnvironment {
  constructor(initialConfig = { location: 'A', roomA: 'Dirty', roomB: 'Dirty' }) {
    this.initialConfig = { ...initialConfig };
    this.reset();
  }

  reset() {
    this.location = this.initialConfig.location; // 'A' | 'B'
    this.roomA = this.initialConfig.roomA;       // 'Clean' | 'Dirty'
    this.roomB = this.initialConfig.roomB;       // 'Clean' | 'Dirty'

    this.roomsCleaned = 0;
    this.movementActions = 0;
    this.totalActions = 0;
    this.score = 0;

    // Track first step when environment became completely clean
    this.firstCompleteStep = (this.roomA === 'Clean' && this.roomB === 'Clean') ? 0 : null;
    this.firstCompleteScore = (this.roomA === 'Clean' && this.roomB === 'Clean') ? 0 : null;

    // History of steps
    this.history = [];
  }

  /**
   * Clone the current environment configuration to a new instance.
   */
  clone() {
    const copy = new VacuumEnvironment(this.initialConfig);
    copy.location = this.location;
    copy.roomA = this.roomA;
    copy.roomB = this.roomB;
    copy.roomsCleaned = this.roomsCleaned;
    copy.movementActions = this.movementActions;
    copy.totalActions = this.totalActions;
    copy.score = this.score;
    copy.firstCompleteStep = this.firstCompleteStep;
    copy.firstCompleteScore = this.firstCompleteScore;
    copy.history = [...this.history];
    return copy;
  }

  /**
   * Returns current full environment state tuple: (Location, Status A, Status B)
   */
  getState() {
    const loc = this.location;
    const rA = this.roomA;
    const rB = this.roomB;
    return {
      location: loc,
      roomA: rA,
      roomB: rB,
      toString: () => `(${loc}, ${rA}, ${rB})`
    };
  }

  /**
   * Returns current percept observed by the robot: (Location, Status of current room)
   */
  getPercept() {
    const loc = this.location;
    const status = loc === 'A' ? this.roomA : this.roomB;
    return {
      location: loc,
      status: status,
      toString: () => `(${loc}, ${status})`
    };
  }

  /**
   * Check if both rooms are clean (Environment Task Completion).
   */
  isTaskComplete() {
    return this.roomA === 'Clean' && this.roomB === 'Clean';
  }

  /**
   * Transition model: RESULT(State, Action) -> New State
   * Also updates score and performance counters according to AIMA rules.
   */
  transition(action) {
    const stateBefore = this.getState();
    const percept = this.getPercept();
    let cleanedThisStep = false;
    let movedThisStep = false;

    if (action === 'Suck') {
      if (this.location === 'A' && this.roomA === 'Dirty') {
        this.roomA = 'Clean';
        this.roomsCleaned++;
        cleanedThisStep = true;
      } else if (this.location === 'B' && this.roomB === 'Dirty') {
        this.roomB = 'Clean';
        this.roomsCleaned++;
        cleanedThisStep = true;
      }
    } else if (action === 'Right') {
      this.location = 'B';
      this.movementActions++;
      movedThisStep = true;
    } else if (action === 'Left') {
      this.location = 'A';
      this.movementActions++;
      movedThisStep = true;
    } else if (action === 'NoOp') {
      // Robot does nothing
    }

    this.totalActions++;

    // Calculate score: +10 per room cleaned, -1.5 per Left/Right movement action
    this.score = (this.roomsCleaned * 10) - (this.movementActions * 1.5);

    const isComplete = this.isTaskComplete();
    if (isComplete && this.firstCompleteStep === null) {
      this.firstCompleteStep = this.totalActions;
      this.firstCompleteScore = this.score;
    }

    const stateAfter = this.getState();

    const record = {
      step: this.totalActions,
      stateBefore: stateBefore.toString(),
      percept: percept.toString(),
      perceptObj: percept,
      action: action,
      stateAfter: stateAfter.toString(),
      cleanedThisStep: cleanedThisStep,
      movedThisStep: movedThisStep,
      roomsCleaned: this.roomsCleaned,
      movementActions: this.movementActions,
      score: this.score,
      isComplete: isComplete
    };

    this.history.push(record);
    return record;
  }
}

// Export to window
window.VacuumEnvironment = VacuumEnvironment;

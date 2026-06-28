import { makeAutoObservable } from 'mobx';

const SAVE_KEY = 'hexage_progress';

class ProgressStore {
  completedStages: number[] = [];

  constructor() {
    makeAutoObservable(this);
    this.completedStages = this.load();
  }

  load(): number[] {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) return JSON.parse(data);
    } catch { /* ignore */ }
    return [];
  }

  save(stageIndex: number) {
    const completed = this.load();
    const next = stageIndex + 1;
    if (!completed.includes(next)) {
      completed.push(next);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(completed)); } catch { /* ignore */ }
    }
    this.completedStages = completed;
  }

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    this.completedStages = [];
  }
}

export const progressStore = new ProgressStore();

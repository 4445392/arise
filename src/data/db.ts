import Dexie, { type EntityTable } from 'dexie'
import type * as M from './models'

export const SCHEMA_VERSION = 1

/** All persistent tables. Add a new `this.version(n)` block for any later schema change. */
export class AriseDB extends Dexie {
  settings!: EntityTable<M.Settings, 'id'>
  player!: EntityTable<M.Player, 'id'>
  dayLogs!: EntityTable<M.DayLog, 'dayKey'>
  events!: EntityTable<M.XpEvent, 'id'>
  exams!: EntityTable<M.Exam, 'id'>
  pulses!: EntityTable<M.PulseRec, 'id'>
  drifts!: EntityTable<M.DriftRec, 'id'>
  journal!: EntityTable<M.JournalEntry, 'id'>
  fears!: EntityTable<M.FearEntry, 'id'>
  sessions!: EntityTable<M.DeepWorkSession, 'id'>
  shadows!: EntityTable<M.Shadow, 'id'>
  motiveTags!: EntityTable<M.MotiveTag, 'id'>
  feedback!: EntityTable<M.ObjectiveFeedback, 'id'>
  thoughtAudits!: EntityTable<M.ThoughtAudit, 'id'>
  courage!: EntityTable<M.CourageRung, 'id'>
  skillGates!: EntityTable<M.SkillGate, 'id'>
  skillLevels!: EntityTable<M.SkillLevel, 'id'>
  reading!: EntityTable<M.ReadingLog, 'id'>
  gold!: EntityTable<M.GoldEntry, 'id'>
  decisions!: EntityTable<M.Decision, 'id'>
  assessments!: EntityTable<M.Assessment, 'id'>
  screenTime!: EntityTable<M.ScreenTimeLog, 'id'>
  titles!: EntityTable<M.TitleState, 'id'>
  purchases!: EntityTable<M.Purchase, 'id'>
  weeklyReports!: EntityTable<M.WeeklyReport, 'id'>
  recordings!: EntityTable<M.Recording, 'id'>

  constructor(name = 'arise') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      player: 'id',
      dayLogs: 'dayKey, mode, closed',
      events: '++id, dayKey, source',
      exams: '++id, dateKey',
      pulses: '++id, dayKey, ts',
      drifts: '++id, dayKey, ts',
      journal: '++id, dayKey',
      fears: '++id, dayKey, checkBack, examId',
      sessions: '++id, dayKey, ts',
      shadows: '++id, ts',
      motiveTags: '++id, dayKey',
      feedback: '++id, dayKey, objectiveKey',
      thoughtAudits: '++id, weekKey',
      courage: '++id, ts',
      skillGates: '++id, skillId',
      skillLevels: '++id, skillId',
      reading: '++id, dayKey',
      gold: '++id, dayKey',
      decisions: '++id, reviewDay',
      assessments: '++id, kind',
      screenTime: '++id, dayKey',
      titles: '++id, titleId',
      purchases: '++id, ts',
      weeklyReports: '++id, weekKey',
      recordings: '++id, dayKey, ts',
    })
    this.version(2).stores({
      assessments: '++id, kind, ts',
    })
    // v3: the Fear Log lists by time (orderBy needs an index)
    this.version(3).stores({
      fears: '++id, dayKey, checkBack, examId, ts',
    })
  }
}

export const TABLE_NAMES = [
  'settings',
  'player',
  'dayLogs',
  'events',
  'exams',
  'pulses',
  'drifts',
  'journal',
  'fears',
  'sessions',
  'shadows',
  'motiveTags',
  'feedback',
  'thoughtAudits',
  'courage',
  'skillGates',
  'skillLevels',
  'reading',
  'gold',
  'decisions',
  'assessments',
  'screenTime',
  'titles',
  'purchases',
  'weeklyReports',
  // 'recordings' (audio blobs) are device-local and deliberately excluded from JSON backups.
] as const satisfies readonly (keyof AriseDB)[]

export type TableName = (typeof TABLE_NAMES)[number]

export const db = new AriseDB()

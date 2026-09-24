import type { Access } from 'payload'

// Всегда true — используется там, где ограничений быть не должно
export const anyone: Access = () => true

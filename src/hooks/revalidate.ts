import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { scheduleFrontendRevalidate } from '@/lib/revalidate'

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  scheduleFrontendRevalidate()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  scheduleFrontendRevalidate()
  return doc
}

import { productionLog } from '@/infrastructure';
import type { ProductionLogEntry } from '../types/activity';

export const getProductionLog = (): Promise<ProductionLogEntry[]> =>
  productionLog();

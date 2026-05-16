import { useState, useCallback } from 'react';
import { explainStat } from '../api/client';

export function useStatExplainer() {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [stat, setStat] = useState('');

  const onExplain = useCallback(async (statKey: string, value: number) => {
    try {
      const res = await explainStat(statKey, value);
      setStat(res.stat);
      setExplanation(res.explanation);
      setOpen(true);
    } catch {
      setStat(statKey);
      setExplanation(
        `${statKey.replace(/_/g, ' ')} of ${value} — contextual benchmark from CRIQ analytics engine.`,
      );
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { open, explanation, stat, onExplain, close };
}

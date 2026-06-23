'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/lib/i18n';
import Bot from 'lucide-react/dist/esm/icons/bot';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

interface CreateResumeChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseAiTailor: () => void;
  onChooseManualEdit: (jobDescription: string) => Promise<void>;
  isLlmConfigured: boolean;
}

type Step = 'choose' | 'manual-setup';

export function CreateResumeChoiceDialog({
  open,
  onOpenChange,
  onChooseAiTailor,
  onChooseManualEdit,
  isLlmConfigured,
}: CreateResumeChoiceDialogProps) {
  const { t } = useTranslations();
  const [step, setStep] = useState<Step>('choose');
  const [jobDescription, setJobDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset dialog state when closed or opened
  useEffect(() => {
    if (open) {
      setStep('choose');
      setJobDescription('');
      setError(null);
      setIsCreating(false);
    }
  }, [open]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      await onChooseManualEdit(jobDescription);
    } catch (err: unknown) {
      console.error(err);
      setError(t('createResume.entry.manualEdit.error') || 'Failed to create copy');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-0 gap-0 rounded-none">
        {step === 'choose' ? (
          <>
            <DialogHeader className="border-b-2 border-black bg-white p-6 text-left">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-blue-700">
                {t('createResume.entry.kicker')}
              </p>
              <DialogTitle className="font-serif text-3xl font-bold uppercase tracking-normal">
                {t('createResume.entry.title')}
              </DialogTitle>
              <DialogDescription className="font-sans text-sm text-steel-grey">
                {t('createResume.entry.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 bg-background p-6 md:grid-cols-2">
              <section className="flex min-h-64 flex-col border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000000] relative">
                <div className="mb-6 flex h-12 w-12 items-center justify-center border-2 border-black bg-blue-700 text-white">
                  <Bot className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-blue-700">
                  {t('createResume.entry.aiTailor.kicker')}
                </p>
                <h3 className="mt-2 font-serif text-2xl font-bold leading-tight">
                  {t('createResume.entry.aiTailor.title')}
                </h3>
                <p className="mt-3 font-sans text-sm text-steel-grey mb-6">
                  {t('createResume.entry.aiTailor.description')}
                </p>
                <div className="mt-auto flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={onChooseAiTailor}
                    disabled={!isLlmConfigured}
                  >
                    {t('createResume.entry.aiTailor.action')}
                  </Button>
                  {!isLlmConfigured && (
                    <p className="font-mono text-[10px] text-red-600 uppercase mt-1">
                      * {t('createResume.entry.aiTailor.disabledHint')}
                    </p>
                  )}
                </div>
              </section>

              <section className="flex min-h-64 flex-col border-2 border-black bg-white p-5">
                <div className="mb-6 flex h-12 w-12 items-center justify-center border-2 border-black bg-background">
                  <Pencil className="h-6 w-6 text-black" aria-hidden="true" />
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-steel-grey">
                  {t('createResume.entry.manualEdit.kicker')}
                </p>
                <h3 className="mt-2 font-serif text-2xl font-bold leading-tight">
                  {t('createResume.entry.manualEdit.title')}
                </h3>
                <p className="mt-3 font-sans text-sm text-steel-grey">
                  {t('createResume.entry.manualEdit.description')}
                </p>
                <Button
                  variant="outline"
                  className="mt-auto w-full"
                  onClick={() => setStep('manual-setup')}
                >
                  {t('createResume.entry.manualEdit.action')}
                </Button>
              </section>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="border-b-2 border-black bg-white p-6 text-left">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-blue-700">
                {t('createResume.entry.manualEdit.kicker')}
              </p>
              <DialogTitle className="font-serif text-3xl font-bold uppercase tracking-normal">
                {t('createResume.entry.manualEdit.title')}
              </DialogTitle>
              <DialogDescription className="font-sans text-sm text-steel-grey">
                {t('createResume.entry.manualEdit.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-background p-6 space-y-4">
              <div className="relative">
                <Textarea
                  placeholder={t('tailor.jobDescriptionPlaceholder')}
                  className="min-h-[200px] font-mono text-sm bg-background border-2 border-black focus:ring-0 focus:border-blue-700 resize-none p-4 rounded-none"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  disabled={isCreating}
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-mono">
                  {error}
                </div>
              )}
              <div className="flex justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('choose')}
                  disabled={isCreating}
                >
                  {t('common.back')}
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('createResume.entry.manualEdit.creating')}
                    </>
                  ) : (
                    t('createResume.entry.manualEdit.action')
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

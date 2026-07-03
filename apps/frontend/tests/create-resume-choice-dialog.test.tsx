import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateResumeChoiceDialog } from '@/components/dashboard/create-resume-choice-dialog';

vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

describe('CreateResumeChoiceDialog', () => {
  it('passes the selected source resume id into manual copy creation', async () => {
    const onChooseManualEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateResumeChoiceDialog
        open
        onOpenChange={vi.fn()}
        onChooseAiTailor={vi.fn()}
        onChooseManualEdit={onChooseManualEdit}
        isLlmConfigured
        canAiTailor
        defaultSourceResumeId="resume_2"
        sourceResumes={[
          {
            resume_id: 'resume_1',
            filename: 'Master.pdf',
            is_master: true,
            parent_id: null,
            processing_status: 'ready',
            created_at: '2026-07-03T00:00:00Z',
            updated_at: '2026-07-03T00:00:00Z',
            title: 'Master Resume',
          },
          {
            resume_id: 'resume_2',
            filename: 'Backend.pdf',
            is_master: false,
            parent_id: null,
            processing_status: 'ready',
            created_at: '2026-07-03T00:00:00Z',
            updated_at: '2026-07-03T00:00:00Z',
            title: 'Backend Resume',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'createResume.entry.manualEdit.action' }));

    fireEvent.change(screen.getByLabelText('Source Resume'), {
      target: { value: 'resume_1' },
    });
    fireEvent.change(screen.getByPlaceholderText('tailor.jobDescriptionPlaceholder'), {
      target: { value: 'JD text' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'createResume.entry.manualEdit.action' }));

    expect(onChooseManualEdit).toHaveBeenCalledWith('resume_1', 'JD text');
  });
});

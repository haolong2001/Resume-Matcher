import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResumeSingleColumn } from '@/components/resume/resume-single-column';
import type { ResumeData } from '@/components/dashboard/resume-component';

vi.mock('@/lib/i18n', () => ({ useTranslations: () => ({ t: (k: string) => k }) }));

describe('ResumeSingleColumn', () => {
  it('shows bullet dots by default for experience points', () => {
    const data: ResumeData = {
      personalInfo: { name: 'Saurabh Rai', email: 'a@b.com', phone: '+91-700' },
      workExperience: [
        {
          id: 1,
          title: 'DevRel Engineer',
          company: 'Apideck',
          years: '2025-Present',
          description: ['Lead client demos.'],
        },
      ],
    } as ResumeData;

    const { container } = render(<ResumeSingleColumn data={data} />);
    expect(screen.getByText('Lead client demos.')).toBeInTheDocument();
    expect(container.textContent).toContain('•');
  });

  it('hides the bullet dot when descriptionBullets is false for a point', () => {
    const data: ResumeData = {
      personalInfo: { name: 'Saurabh Rai', email: 'a@b.com', phone: '+91-700' },
      workExperience: [
        {
          id: 1,
          title: 'DevRel Engineer',
          company: 'Apideck',
          years: '2025-Present',
          description: ['Lead client demos.'],
          descriptionBullets: [false],
        },
      ],
    } as ResumeData;

    const { container } = render(<ResumeSingleColumn data={data} />);
    expect(screen.getByText('Lead client demos.')).toBeInTheDocument();
    expect(container.textContent).not.toContain('•');
  });
});

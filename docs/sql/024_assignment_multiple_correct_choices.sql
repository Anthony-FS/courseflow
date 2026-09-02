-- CourseFlow: allow multiple canonical correct letters on 4-choice assignments
-- Apply in Supabase Dashboard → SQL Editor (or via linked CLI).

begin;

alter table public.assignments
  drop constraint if exists assignments_answer_fields_check;

alter table public.assignments
  add constraint assignments_answer_fields_check
  check (
    (
      submission_type = 'choice'
      and answer_text is null
      and choice_a is not null and btrim(choice_a) <> ''
      and choice_b is not null and btrim(choice_b) <> ''
      and choice_c is not null and btrim(choice_c) <> ''
      and choice_d is not null and btrim(choice_d) <> ''
      and correct_choice is not null
      and correct_choice in (
        'A', 'B', 'C', 'D',
        'A,B', 'A,C', 'A,D', 'B,C', 'B,D', 'C,D',
        'A,B,C', 'A,B,D', 'A,C,D', 'B,C,D',
        'A,B,C,D'
      )
    )
    or (
      submission_type <> 'choice'
      and choice_a is null
      and choice_b is null
      and choice_c is null
      and choice_d is null
      and correct_choice is null
      and (
        submission_type = 'text'
        or answer_text is null
      )
    )
  );

commit;

-- CourseFlow: expand Basic Programming sub-lesson copy to match
-- typical Back-end Development lesson length.
-- Overwrites short descriptions (shorter than Back-end average, or ~1600+ chars).
-- Run in Supabase SQL Editor with an admin/service-role context.

begin;

create temporary table _backend_target on commit drop as
select greatest(
  coalesce(
    (
      select avg(length(sl.description))::int
      from public.sub_lessons sl
      join public.lessons l on l.id = sl.lesson_id
      join public.courses c on c.id = l.course_id
      where lower(btrim(c.title)) in (
        'back-end development',
        'backend development',
        'back end development'
      )
        and sl.description is not null
        and btrim(sl.description) <> ''
    ),
    1800
  ),
  1600
) as min_chars;

with course_sub_lessons as (
  select
    sl.id as sub_lesson_id,
    lower(btrim(sl.title)) as title_key,
    length(coalesce(sl.description, '')) as current_len
  from public.sub_lessons sl
  join public.lessons l on l.id = sl.lesson_id
  join public.courses c on c.id = l.course_id
  where lower(btrim(c.title)) = 'basic programming'
),
seed_content (title_key, description) as (
  values
    (
      'what programming is',
      $txt$Programming is the craft of writing clear, unambiguous instructions that a computer can follow. Those instructions—called code—tell the machine what data to use, which decisions to make, and what results to produce. Unlike casual human conversation, every detail matters: a missing step or unclear condition can change the outcome completely.

At its core, programming turns ideas into step-by-step procedures. You start with a goal, break it into smaller tasks, and express each task in a language the computer understands. Once you see a program as a precise recipe, learning any language becomes easier because every language is still expressing the same fundamental ideas.

A useful mental model is to separate three layers: the problem you want to solve, the logic of your solution, and the syntax of a particular language. Beginners often jump straight into syntax and feel lost. If you keep the problem and the logic clear first, the language becomes a tool rather than the whole subject.

As you practice, you will write tiny programs that read input, transform data, and display output. Those small wins build confidence. Over time, the same patterns appear again and again—storing values, repeating work, choosing between paths—so early lessons are not isolated facts; they are the vocabulary of everything you will build later.

Before moving on, try explaining programming in one sentence to a friend who does not code. If you can do that without leaning on jargon, you already understand the heart of this lesson.$txt$
    ),
    (
      'what programmers do',
      $txt$Programmers solve problems by breaking them into smaller parts, designing an approach, and then implementing that approach in code. Day to day, that can mean building features, fixing bugs, reviewing teammates’ work, or improving how a system performs under real traffic and real users.

They also spend a surprising amount of time reading existing code. Understanding what a program already does—and why—is often harder than writing a brand-new file from scratch. Good programmers navigate unfamiliar projects patiently, leave clearer notes for the next person, and ask focused questions when something is unclear.

Communication is part of the job too. Programmers work with designers, product managers, support teams, and customers. Translating a vague request into a concrete technical plan is a skill you practice constantly. Writing code is only one piece; understanding the problem and verifying the solution matter just as much.

Testing and debugging sit beside feature work. When something fails, programmers reproduce the issue, form a hypothesis, check assumptions, and change one thing at a time. That investigative mindset is as important as memorizing language features.

If you enjoy puzzles, careful thinking, and making invisible systems behave reliably, you will recognize yourself in this work. This course gives you the foundation those daily habits rest on.$txt$
    ),
    (
      'common uses of programming',
      $txt$Programming powers almost every digital product you use: websites, mobile apps, games, payment systems, and the software inside cars, watches, and home devices. Businesses rely on code to store data, automate workflows, personalize recommendations, and deliver services to millions of people at once.

Beyond consumer apps, programming shows up in science, finance, education, healthcare, and creative tools. Researchers simulate experiments, analysts process large datasets, and artists generate visuals or music with scripts. Wherever information needs to be processed reliably and repeatedly, software—and the people who write it—play a central role.

Different domains emphasize different skills, but they share the same basics. A banking system and a simple to-do app both need clear logic, careful handling of data, and ways to recover when something goes wrong. Learning those basics here prepares you to specialize later without relearning the foundations.

Automation is another major use. Scripts can rename files, send reports, check websites for changes, or connect two tools that were never designed to talk to each other. Even a short program can save hours of manual work each week.

As you continue through this course, keep asking: “Where could this idea appear in a real product?” Connecting each concept to a use case makes the material stick and keeps practice purposeful.$txt$
    ),
    (
      'how computers read instructions',
      $txt$Computers do not understand human language the way people do. Source code is translated into simpler machine instructions that the processor can execute, either by compiling the program ahead of time or interpreting it step by step while it runs. That translation bridge is why the same idea can be written in many languages and still end up as work the hardware can perform.

Each machine instruction is tiny—load a value, add two numbers, compare results, jump to another step—but millions of them execute every second. Your high-level code describes intent; the runtime and processor handle the microscopic details. Understanding this pipeline helps you see why careful logic and clear structure matter so much.

When something goes wrong, the computer is not being stubborn—it is following the instructions it received. Error messages, stack traces, and logs are clues about which instruction failed and why. Learning to read those clues turns debugging from guesswork into a method.

Memory and storage also shape how instructions run. Values live in temporary memory while a program works, and may be saved to disk when they need to persist. Knowing roughly where data lives will make later topics like variables, files, and databases feel less mysterious.

You do not need to memorize processor details to write good programs. You do need the habit of thinking in precise steps. That habit is the real goal of this lesson.$txt$
    ),
    (
      'what a program is made of',
      $txt$Most programs combine data, operations on that data, and control flow that decides what happens next. Variables store values, functions group reusable steps, and conditions or loops choose or repeat actions based on the current situation. Together, those pieces let you model almost any process you can describe clearly.

As programs grow, organization becomes essential. Files, modules, and clear naming help you and other programmers navigate the code without keeping every detail in your head at once. Good structure is not decoration—it is how teams stay fast as features accumulate.

Inputs and outputs frame every program. Something comes in (user typing, a file, a network request), the program transforms it, and something goes out (a screen update, a saved record, a message). Drawing that flow before coding often prevents half of beginner mistakes.

Errors are part of the design too. Real programs plan for missing data, invalid input, and unexpected states. Even early exercises benefit when you ask, “What if this value is empty?” That question is the beginning of robust software.

In the lessons ahead you will practice each building block in isolation, then combine them. Treat every small exercise as training for larger systems—the same ingredients appear at every scale.$txt$
    ),
    (
      'thinking like a computer',
      $txt$Computers follow instructions literally. If a step is missing, ambiguous, or out of order, the result will be wrong even when the overall idea seemed obvious to a human. Learning to program means learning to be explicit about every assumption you would normally leave unspoken.

A helpful habit is to walk through your logic with a small example on paper before you type. Choose simple inputs, write the expected result, then simulate each step. When you can predict the outcome, you are already thinking the way a reliable program needs to behave.

Another habit is to reduce the problem. Instead of solving everything at once, handle one case correctly, then expand. Programmers call this incremental development. It keeps feedback fast and mistakes easy to find.

When your mental model and the computer’s behavior disagree, trust the computer’s output and revise your model. That humility—updating your understanding when reality disagrees—is a professional strength, not a failure.

Keep practicing this mindset in every exercise: be precise, test with examples, shrink the problem, and adjust when surprised. Those habits transfer to every language and every future project.$txt$
    )
)
update public.sub_lessons as sl
set description = seed.description
from course_sub_lessons csl
join seed_content seed on seed.title_key = csl.title_key
cross join _backend_target bt
where sl.id = csl.sub_lesson_id
  and csl.current_len < bt.min_chars;

update public.sub_lessons as sl
set description = format(
  E'%s is a core idea in this part of Basic Programming. In this lesson you will learn what the concept means, why it matters when you write software, and how it connects to the skills you are building across the course.\n\nStart by reading the idea slowly and relating it to something familiar—an app you use, a task you repeat, or a process you already understand. Concrete examples make abstract programming topics easier to remember and easier to apply.\n\nNext, practice explaining the concept in your own words without copying the lesson text. If you can teach it back clearly, you understand it. If you get stuck, revisit the examples and notice which detail was missing from your explanation.\n\nFinally, connect this topic to the surrounding sub-lessons. Programming knowledge compounds: each idea becomes more useful when you can combine it with the next one. Write down one question you still have so you can answer it as you continue.\n\nTake your time with the practice that follows. Short, focused repetition builds the fluency you will need for larger projects later in your learning path.',
  initcap(sl.title)
)
from public.lessons l
join public.courses c on c.id = l.course_id
cross join _backend_target bt
where sl.lesson_id = l.id
  and lower(btrim(c.title)) = 'basic programming'
  and length(coalesce(sl.description, '')) < bt.min_chars;

commit;

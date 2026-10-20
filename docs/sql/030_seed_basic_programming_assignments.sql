-- CourseFlow: presentation assignments for every Basic Programming sub-lesson.
-- One text, file, url, and choice assignment per sub-lesson.
-- Skips a submission type that already exists on that sub-lesson.
-- Text and choice rows store the answer key. File and url rows do not.
-- Run in Supabase SQL Editor with an admin/service-role context,
-- or: node --env-file=.env scripts/apply-supabase-sql.mjs docs/sql/030_seed_basic_programming_assignments.sql

begin;

create temporary table _bp_assignment_seed (
  title_key text not null,
  submission_type text not null,
  title text not null,
  description text,
  allowed_file_types text,
  max_file_size_mb text,
  answer_text text,
  choice_a text,
  choice_b text,
  choice_c text,
  choice_d text,
  correct_choice text
) on commit drop;

insert into _bp_assignment_seed (
  title_key,
  submission_type,
  title,
  description,
  allowed_file_types,
  max_file_size_mb,
  answer_text,
  choice_a,
  choice_b,
  choice_c,
  choice_d,
  correct_choice
)
values
  ($k$what programming is$k$, 'text', $t$What is programming, in one short sentence?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Writing clear instructions a computer can follow.$a$, null, null, null, null, null),
  ($k$what programming is$k$, 'choice', $t$Which statement best describes programming?$t$, $d$Choose one answer.$d$, null, null, null, $a$Drawing the app layout$a$, $b$Writing clear instructions a computer can follow$b$, $c$Only fixing other people's bugs$c$, $d$Memorizing one programming language$d$, 'B'),
  ($k$what programming is$k$, 'file', $t$Upload a one-page PDF that explains programming in your own words.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$what programming is$k$, 'url', $t$Paste a link to a page that explains what programming is.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$what programmers do$k$, 'text', $t$Name one daily task of a programmer besides writing new code.$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Reading existing code$a$, null, null, null, null, null),
  ($k$what programmers do$k$, 'choice', $t$Which activity is part of a programmer's job?$t$, $d$Choose one answer.$d$, null, null, null, $a$Only designing logos$a$, $b$Reading existing code and fixing bugs$b$, $c$Printing documents by hand$c$, $d$Ignoring error messages$d$, 'B'),
  ($k$what programmers do$k$, 'file', $t$Upload a PDF listing three things programmers do.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$what programmers do$k$, 'url', $t$Paste a link about what software developers do.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$common uses of programming$k$, 'text', $t$Name one product that programming powers.$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Websites$a$, null, null, null, null, null),
  ($k$common uses of programming$k$, 'choice', $t$Which of these is a common use of programming?$t$, $d$Choose one answer.$d$, null, null, null, $a$Websites and mobile apps$a$, $b$Replacing all human conversation$b$, $c$Only paper notebooks$c$, $d$Turning off the computer forever$d$, 'A'),
  ($k$common uses of programming$k$, 'file', $t$Upload a PDF with two real-world uses of programming.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$common uses of programming$k$, 'url', $t$Paste a link to a website or app that is built with code.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$how computers read instructions$k$, 'text', $t$What must happen to source code before the processor can run it?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$It is translated into machine instructions$a$, null, null, null, null, null),
  ($k$how computers read instructions$k$, 'choice', $t$How does a computer run source code?$t$, $d$Choose one answer.$d$, null, null, null, $a$It guesses the programmer's mood$a$, $b$Source code is translated into machine instructions$b$, $c$It skips every other line$c$, $d$It only reads comments$d$, 'B'),
  ($k$how computers read instructions$k$, 'file', $t$Upload a PDF that describes compile or interpret in one paragraph.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$how computers read instructions$k$, 'url', $t$Paste a link that explains how a programming language is compiled or interpreted.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$high-level vs low-level ideas$k$, 'text', $t$Which is closer to human-readable code: high-level or low-level?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$high-level$a$, null, null, null, null, null),
  ($k$high-level vs low-level ideas$k$, 'choice', $t$A high-level language is closer to which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$Human-readable ideas$a$, $b$Raw electrical signals only$b$, $c$The computer's power button$c$, $d$A printed circuit board diagram$d$, 'A'),
  ($k$high-level vs low-level ideas$k$, 'file', $t$Upload a PDF comparing high-level and low-level in two sentences.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$high-level vs low-level ideas$k$, 'url', $t$Paste a link that compares high-level and low-level languages.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$choosing a first programming language$k$, 'text', $t$What matters more: the language name, or learning the shared ideas?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$learning the shared ideas$a$, null, null, null, null, null),
  ($k$choosing a first programming language$k$, 'choice', $t$What is the best reason to pick a first programming language?$t$, $d$Choose one answer.$d$, null, null, null, $a$It is the only language that will ever exist$a$, $b$It helps you practice ideas you can reuse in other languages$b$, $c$It has the longest name$c$, $d$It cannot show errors$d$, 'B'),
  ($k$choosing a first programming language$k$, 'file', $t$Upload a PDF naming one language you would start with and why.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$choosing a first programming language$k$, 'url', $t$Paste a link to the official site of a beginner-friendly language.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$variables and storing data$k$, 'text', $t$What does a variable store?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$A value$a$, null, null, null, null, null),
  ($k$variables and storing data$k$, 'choice', $t$A variable is used to do which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$Store a value the program can use later$a$, $b$Delete the whole computer$b$, $c$Draw only images$c$, $d$Replace every function$d$, 'A'),
  ($k$variables and storing data$k$, 'file', $t$Upload a PDF showing one variable name and the value it stores.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$variables and storing data$k$, 'url', $t$Paste a link that explains variables.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$data types$k$, 'text', $t$What data type would you use for the whole number 42?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$number$a$, null, null, null, null, null),
  ($k$data types$k$, 'choice', $t$Which value is text, not a number?$t$, $d$Choose one answer.$d$, null, null, null, $a$42$a$, $b$"hello"$b$, $c$3.14$c$, $d$0$d$, 'B'),
  ($k$data types$k$, 'file', $t$Upload a PDF listing three data types and one example of each.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$data types$k$, 'url', $t$Paste a link that explains data types.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$input and output$k$, 'text', $t$What do we call information a program shows to the user?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$output$a$, null, null, null, null, null),
  ($k$input and output$k$, 'choice', $t$Typing your name into a program is an example of what?$t$, $d$Choose one answer.$d$, null, null, null, $a$Input$a$, $b$A comment$b$, $c$A loop that never ends$c$, $d$A file size limit$d$, 'A'),
  ($k$input and output$k$, 'file', $t$Upload a PDF describing one input and one output of a small program.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$input and output$k$, 'url', $t$Paste a link about program input and output.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$operators and expressions$k$, 'text', $t$What is the result of 2 + 3?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$5$a$, null, null, null, null, null),
  ($k$operators and expressions$k$, 'choice', $t$Which operator adds two numbers?$t$, $d$Choose one answer.$d$, null, null, null, $a$+$a$, $b$==$b$, $c$//$c$, $d$#$d$, 'A'),
  ($k$operators and expressions$k$, 'file', $t$Upload a PDF with three expressions and their results.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$operators and expressions$k$, 'url', $t$Paste a link that explains arithmetic operators.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$basic syntax$k$, 'text', $t$What do we call the grammar rules of a programming language?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$syntax$a$, null, null, null, null, null),
  ($k$basic syntax$k$, 'choice', $t$Syntax is best described as which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$The grammar rules of the language$a$, $b$The color of the editor$b$, $c$The computer's brand$c$, $d$A type of loop$d$, 'A'),
  ($k$basic syntax$k$, 'file', $t$Upload a PDF with one valid line of code and one line that would be a syntax error.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$basic syntax$k$, 'url', $t$Paste a link about syntax errors.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$comments and readability$k$, 'text', $t$Are comments executed by the computer? Answer yes or no.$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$no$a$, null, null, null, null, null),
  ($k$comments and readability$k$, 'choice', $t$Why do programmers write comments?$t$, $d$Choose one answer.$d$, null, null, null, $a$So people can understand the code$a$, $b$Because the computer requires a comment on every line$b$, $c$To make the program run faster every time$c$, $d$To store the user's password$d$, 'A'),
  ($k$comments and readability$k$, 'file', $t$Upload a PDF with a short code snippet and a comment that explains it.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$comments and readability$k$, 'url', $t$Paste a link about writing readable code or comments.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$boolean values$k$, 'text', $t$Name the two Boolean values.$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$true and false$a$, null, null, null, null, null),
  ($k$boolean values$k$, 'choice', $t$Which pair lists the Boolean values?$t$, $d$Choose one answer.$d$, null, null, null, $a$true and false$a$, $b$yes and maybe$b$, $c$1 and 2 only$c$, $d$start and stop$d$, 'A'),
  ($k$boolean values$k$, 'file', $t$Upload a PDF with two real-life statements labeled true or false.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$boolean values$k$, 'url', $t$Paste a link that explains Boolean values.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$if statements$k$, 'text', $t$Which keyword starts a conditional block?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$if$a$, null, null, null, null, null),
  ($k$if statements$k$, 'choice', $t$An if statement runs its body when which of these is true?$t$, $d$Choose one answer.$d$, null, null, null, $a$The condition is true$a$, $b$The file is a PDF$b$, $c$The loop counter is always 100$c$, $d$The comment is longer than the code$d$, 'A'),
  ($k$if statements$k$, 'file', $t$Upload a PDF with one if statement written in plain language or code.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$if statements$k$, 'url', $t$Paste a link that explains if statements.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$else and else-if$k$, 'text', $t$Which branch runs when the if condition is false and an else exists?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$else$a$, null, null, null, null, null),
  ($k$else and else-if$k$, 'choice', $t$When should else-if be used?$t$, $d$Choose one answer.$d$, null, null, null, $a$To check another condition after the first if is false$a$, $b$To delete all variables$b$, $c$To end the program immediately$c$, $d$To replace a comment$d$, 'A'),
  ($k$else and else-if$k$, 'file', $t$Upload a PDF showing if, else-if, and else for one example.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$else and else-if$k$, 'url', $t$Paste a link about else and else-if.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$comparison operators$k$, 'text', $t$Which operator checks whether two values are equal? Use the two-character form.$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$==$a$, null, null, null, null, null),
  ($k$comparison operators$k$, 'choice', $t$What does 5 > 3 evaluate to?$t$, $d$Choose one answer.$d$, null, null, null, $a$true$a$, $b$false$b$, $c$5$c$, $d$3$d$, 'A'),
  ($k$comparison operators$k$, 'file', $t$Upload a PDF with four comparisons and whether each is true or false.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$comparison operators$k$, 'url', $t$Paste a link about comparison operators.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$logical operators$k$, 'text', $t$If both conditions must be true, which operator do you use: and, or, or not?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$and$a$, null, null, null, null, null),
  ($k$logical operators$k$, 'choice', $t$When does A and B become true?$t$, $d$Choose one answer.$d$, null, null, null, $a$Only when both A and B are true$a$, $b$When either one is true$b$, $c$When both are false$c$, $d$Never$d$, 'A'),
  ($k$logical operators$k$, 'file', $t$Upload a PDF with one and example and one or example.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$logical operators$k$, 'url', $t$Paste a link about logical operators.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$nested conditions$k$, 'text', $t$A nested condition is a condition placed where?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$inside another condition$a$, null, null, null, null, null),
  ($k$nested conditions$k$, 'choice', $t$Which description matches a nested condition?$t$, $d$Choose one answer.$d$, null, null, null, $a$An if statement inside another if statement$a$, $b$Two files uploaded at once$b$, $c$A comment after a function$c$, $d$A loop that prints only once$d$, 'A'),
  ($k$nested conditions$k$, 'file', $t$Upload a PDF that writes a nested decision, such as: if it is raining, then if you have an umbrella.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$nested conditions$k$, 'url', $t$Paste a link that shows nested if statements.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$why loops are useful$k$, 'text', $t$What do loops help you avoid?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Repeating the same code by hand$a$, null, null, null, null, null),
  ($k$why loops are useful$k$, 'choice', $t$Why are loops useful?$t$, $d$Choose one answer.$d$, null, null, null, $a$They repeat work without copying the same lines many times$a$, $b$They remove the need for variables$b$, $c$They turn every error into a comment$c$, $d$They run code only one time$d$, 'A'),
  ($k$why loops are useful$k$, 'file', $t$Upload a PDF describing a task you would automate with a loop.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$why loops are useful$k$, 'url', $t$Paste a link that explains why loops exist.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$for loops$k$, 'text', $t$A for loop is a good fit when you know which of these?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$How many times to repeat$a$, null, null, null, null, null),
  ($k$for loops$k$, 'choice', $t$Which situation fits a for loop best?$t$, $d$Choose one answer.$d$, null, null, null, $a$Repeat a step a known number of times$a$, $b$Wait forever with no condition$b$, $c$Store a user's name$c$, $d$Compare two Booleans once$d$, 'A'),
  ($k$for loops$k$, 'file', $t$Upload a PDF with a for loop that would print the numbers 1 to 3.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$for loops$k$, 'url', $t$Paste a link about for loops.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$while loops$k$, 'text', $t$A while loop keeps going as long as what is true?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$its condition$a$, null, null, null, null, null),
  ($k$while loops$k$, 'choice', $t$A while loop stops when which of these happens?$t$, $d$Choose one answer.$d$, null, null, null, $a$Its condition becomes false$a$, $b$The file upload finishes$b$, $c$A comment is deleted$c$, $d$The variable name is long$d$, 'A'),
  ($k$while loops$k$, 'file', $t$Upload a PDF with a while loop written in plain language.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$while loops$k$, 'url', $t$Paste a link about while loops.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$loop counters$k$, 'text', $t$What is a loop counter typically used to track?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$How many times the loop has run$a$, null, null, null, null, null),
  ($k$loop counters$k$, 'choice', $t$Which value is a typical loop counter update?$t$, $d$Choose one answer.$d$, null, null, null, $a$count = count + 1$a$, $b$count = "hello"$b$, $c$count = a PDF file$c$, $d$count = true and false together$d$, 'A'),
  ($k$loop counters$k$, 'file', $t$Upload a PDF showing a counter starting at 0 and increasing by 1.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$loop counters$k$, 'url', $t$Paste a link that explains loop counters or incrementing.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$breaking out of loops$k$, 'text', $t$Which keyword leaves a loop early in many languages?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$break$a$, null, null, null, null, null),
  ($k$breaking out of loops$k$, 'choice', $t$What does break do inside a loop?$t$, $d$Choose one answer.$d$, null, null, null, $a$Leaves the loop immediately$a$, $b$Restarts the computer$b$, $c$Converts the loop into a comment$c$, $d$Uploads a file$d$, 'A'),
  ($k$breaking out of loops$k$, 'file', $t$Upload a PDF describing a case where you would stop a loop early.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$breaking out of loops$k$, 'url', $t$Paste a link about the break statement.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$common loop mistakes$k$, 'text', $t$What mistake makes a loop run forever?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$A condition that never becomes false$a$, null, null, null, null, null),
  ($k$common loop mistakes$k$, 'choice', $t$Which is a common loop mistake?$t$, $d$Choose one answer.$d$, null, null, null, $a$Forgetting to update the counter so the condition never changes$a$, $b$Using a variable once$b$, $c$Writing a comment$c$, $d$Choosing a short function name$d$, 'A'),
  ($k$common loop mistakes$k$, 'file', $t$Upload a PDF that shows one infinite-loop mistake and how to fix it.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$common loop mistakes$k$, 'url', $t$Paste a link about infinite loops or off-by-one errors.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$what functions are$k$, 'text', $t$A function groups reusable steps under what?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$a name$a$, null, null, null, null, null),
  ($k$what functions are$k$, 'choice', $t$Which description best fits a function?$t$, $d$Choose one answer.$d$, null, null, null, $a$A named group of steps you can reuse$a$, $b$A file size limit$b$, $c$A Boolean that is always false$c$, $d$A comment the computer executes$d$, 'A'),
  ($k$what functions are$k$, 'file', $t$Upload a PDF naming one function and what it should do.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$what functions are$k$, 'url', $t$Paste a link that explains functions.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$defining a function$k$, 'text', $t$What do we call the act of writing a function's name and body?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$defining a function$a$, null, null, null, null, null),
  ($k$defining a function$k$, 'choice', $t$Defining a function means which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$Writing the function so it exists and can be used later$a$, $b$Running it immediately with no name$b$, $c$Deleting all variables$c$, $d$Uploading a PDF$d$, 'A'),
  ($k$defining a function$k$, 'file', $t$Upload a PDF with a function definition in code or plain language.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$defining a function$k$, 'url', $t$Paste a link that shows how to define a function.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$calling a function$k$, 'text', $t$What do we call it when the program actually runs a function?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$calling the function$a$, null, null, null, null, null),
  ($k$calling a function$k$, 'choice', $t$Calling a function does which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$Runs the steps inside that function$a$, $b$Turns the function into a comment$b$, $c$Changes the file type to PDF$c$, $d$Skips the function forever$d$, 'A'),
  ($k$calling a function$k$, 'file', $t$Upload a PDF that shows a function being called once.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$calling a function$k$, 'url', $t$Paste a link about calling or invoking a function.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$parameters and arguments$k$, 'text', $t$The value you pass in when you call a function is called what?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$an argument$a$, null, null, null, null, null),
  ($k$parameters and arguments$k$, 'choice', $t$A parameter is which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$A name in the function definition that receives a value$a$, $b$The PDF file size$b$, $c$A loop that never starts$c$, $d$The course price$d$, 'A'),
  ($k$parameters and arguments$k$, 'file', $t$Upload a PDF with one parameter and one argument labeled.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$parameters and arguments$k$, 'url', $t$Paste a link that explains parameters and arguments.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$return values$k$, 'text', $t$What do we call the value a function sends back to the caller?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$a return value$a$, null, null, null, null, null),
  ($k$return values$k$, 'choice', $t$A return value is which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$The result a function gives back$a$, $b$A comment at the top of the file$b$, $c$The loop counter$c$, $d$An uploaded image$d$, 'A'),
  ($k$return values$k$, 'file', $t$Upload a PDF showing a function that returns a number.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$return values$k$, 'url', $t$Paste a link about return values.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$breaking problems into smaller parts$k$, 'text', $t$Before coding a big task, what should you do first?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Break it into smaller parts$a$, null, null, null, null, null),
  ($k$breaking problems into smaller parts$k$, 'choice', $t$Which approach matches this lesson?$t$, $d$Choose one answer.$d$, null, null, null, $a$Split a big problem into smaller steps$a$, $b$Write the whole program in one line$b$, $c$Skip planning and guess$c$, $d$Delete the problem$d$, 'A'),
  ($k$breaking problems into smaller parts$k$, 'file', $t$Upload a PDF that splits one problem into three smaller steps.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$breaking problems into smaller parts$k$, 'url', $t$Paste a link about problem decomposition.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$reusing code effectively$k$, 'text', $t$What should you do instead of copying the same steps many times?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Put them in a function$a$, null, null, null, null, null),
  ($k$reusing code effectively$k$, 'choice', $t$Effective reuse means which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$Call a function instead of copying the same code$a$, $b$Paste the same lines in every file$b$, $c$Never name your functions$c$, $d$Avoid parameters$d$, 'A'),
  ($k$reusing code effectively$k$, 'file', $t$Upload a PDF showing one repeated task you would turn into a function.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$reusing code effectively$k$, 'url', $t$Paste a link about code reuse.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$review of key concepts$k$, 'text', $t$Name two building blocks from this course, separated by a comma.$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$variables, loops$a$, null, null, null, null, null),
  ($k$review of key concepts$k$, 'choice', $t$Which pair belongs to the core ideas of this course?$t$, $d$Choose one answer.$d$, null, null, null, $a$Variables and loops$a$, $b$Only file uploads$b$, $c$Course prices and promo codes$c$, $d$Cover images and trailers$d$, 'A'),
  ($k$review of key concepts$k$, 'file', $t$Upload a PDF that reviews two ideas from the course.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$review of key concepts$k$, 'url', $t$Paste a link you would use to review one idea from this course.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$variables, conditions, loops, and functions$k$, 'text', $t$Which of the four tools chooses a path: variables, conditions, loops, or functions?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$conditions$a$, null, null, null, null, null),
  ($k$variables, conditions, loops, and functions$k$, 'choice', $t$Which tool repeats work?$t$, $d$Choose one answer.$d$, null, null, null, $a$A loop$a$, $b$A variable name$b$, $c$A comment$c$, $d$A file upload$d$, 'A'),
  ($k$variables, conditions, loops, and functions$k$, 'file', $t$Upload a PDF that gives one example each of a variable, a condition, a loop, and a function.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$variables, conditions, loops, and functions$k$, 'url', $t$Paste a link that covers any one of these four ideas.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$how the pieces work together$k$, 'text', $t$A program typically takes input, transforms it, and produces what?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$output$a$, null, null, null, null, null),
  ($k$how the pieces work together$k$, 'choice', $t$Which order matches a simple program?$t$, $d$Choose one answer.$d$, null, null, null, $a$Input, then logic, then output$a$, $b$Output only, with no input$b$, $c$Comments, then delete the code$c$, $d$Upload a file, then stop forever$d$, 'A'),
  ($k$how the pieces work together$k$, 'file', $t$Upload a PDF that traces one small program from input to output.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$how the pieces work together$k$, 'url', $t$Paste a link about how a simple program is structured.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$common beginner mistakes$k$, 'text', $t$Name one common beginner mistake.$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Forgetting that the computer follows instructions literally$a$, null, null, null, null, null),
  ($k$common beginner mistakes$k$, 'choice', $t$Which is a common beginner mistake?$t$, $d$Choose one answer.$d$, null, null, null, $a$Skipping a step because it felt obvious$a$, $b$Giving a variable a clear name$b$, $c$Testing with a small example$c$, $d$Reading the error message$d$, 'A'),
  ($k$common beginner mistakes$k$, 'file', $t$Upload a PDF describing one beginner mistake and how to avoid it.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$common beginner mistakes$k$, 'url', $t$Paste a link about common programming mistakes for beginners.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$next steps for learning$k$, 'text', $t$After this course, what should you do next with the ideas you learned?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$Practice them in small programs$a$, null, null, null, null, null),
  ($k$next steps for learning$k$, 'choice', $t$A good next step is which of these?$t$, $d$Choose one answer.$d$, null, null, null, $a$Build small programs that reuse these ideas$a$, $b$Stop reading error messages$b$, $c$Memorize only one error$c$, $d$Avoid functions forever$d$, 'A'),
  ($k$next steps for learning$k$, 'file', $t$Upload a PDF with one next-step practice idea.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$next steps for learning$k$, 'url', $t$Paste a link to a tutorial you would try after this course.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null),
  ($k$practicing with small projects$k$, 'text', $t$Why are small projects useful?$t$, $d$After you submit, compare your answer with the suggested answer.$d$, null, null, $a$They combine the ideas in a real task$a$, null, null, null, null, null),
  ($k$practicing with small projects$k$, 'choice', $t$Which project is a good first practice?$t$, $d$Choose one answer.$d$, null, null, null, $a$A tiny program that uses variables, a condition, and a loop$a$, $b$A full operating system$b$, $c$A project with no inputs and no outputs$c$, $d$A file that is only comments$d$, 'A'),
  ($k$practicing with small projects$k$, 'file', $t$Upload a PDF outlining a small project in three steps.$t$, $d$Upload a PDF. Maximum size 5 MB.$d$, 'pdf', '5', null, null, null, null, null, null),
  ($k$practicing with small projects$k$, 'url', $t$Paste a link to a small beginner project idea.$t$, $d$Paste any link that starts with https://.$d$, null, null, null, null, null, null, null, null);

do $$
declare
  missing text;
begin
  select string_agg(distinct seed.title_key, ', ' order by seed.title_key)
  into missing
  from _bp_assignment_seed as seed
  where not exists (
    select 1
    from public.sub_lessons as sl
    join public.lessons as l on l.id = sl.lesson_id
    join public.courses as c on c.id = l.course_id
    where lower(btrim(c.title)) = 'basic programming'
      and lower(btrim(sl.title)) = seed.title_key
  );

  if missing is not null then
    raise exception 'Basic Programming sub-lessons not found: %', missing;
  end if;
end $$;

insert into public.assignments (
  course_id,
  sub_lesson_id,
  title,
  description,
  submission_type,
  allowed_file_types,
  max_file_size_mb,
  answer_text,
  choice_a,
  choice_b,
  choice_c,
  choice_d,
  correct_choice,
  is_active
)
select
  c.id,
  sl.id,
  seed.title,
  seed.description,
  seed.submission_type,
  case
    when seed.allowed_file_types is null then null
    else string_to_array(seed.allowed_file_types, ',')
  end,
  nullif(seed.max_file_size_mb, '')::int,
  seed.answer_text,
  seed.choice_a,
  seed.choice_b,
  seed.choice_c,
  seed.choice_d,
  seed.correct_choice,
  true
from _bp_assignment_seed as seed
join public.sub_lessons as sl
  on lower(btrim(sl.title)) = seed.title_key
join public.lessons as l
  on l.id = sl.lesson_id
join public.courses as c
  on c.id = l.course_id
 and lower(btrim(c.title)) = 'basic programming'
where not exists (
  select 1
  from public.assignments as existing
  where existing.sub_lesson_id = sl.id
    and existing.submission_type = seed.submission_type
);

commit;

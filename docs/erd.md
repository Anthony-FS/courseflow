# CourseFlow database ERD

Normalized public schema on top of Supabase `auth.users`. Email and password stay in Auth; “change password” needs no extra table.

Out of scope: payments, bundles, extra course filters (type, subject), REST path list, SQL / RLS.

## Diagram

```mermaid
erDiagram
  auth_users ||--|| profiles : has
  profiles ||--o{ enrollments : subscribes
  profiles ||--o{ wishlists : saves
  profiles ||--o{ submissions : writes
  profiles ||--o{ sub_lesson_progress : tracks
  profiles ||--o{ reviews : writes
  profiles ||--o{ promo_redemptions : redeems
  profiles ||--o{ courses : creates

  courses ||--o{ sub_lessons : contains
  courses ||--o{ materials : has
  courses ||--o{ enrollments : has
  courses ||--o{ wishlists : saved_in
  courses ||--o{ assignments : has
  courses ||--o{ reviews : receives
  courses ||--o{ promo_codes : discounts

  sub_lessons ||--o{ materials : has
  sub_lessons ||--o{ assignments : optional
  sub_lessons ||--o{ sub_lesson_progress : tracked_by

  assignments ||--o{ submissions : receives
  enrollments ||--o| promo_redemptions : used_on
  promo_codes ||--o{ promo_redemptions : redeemed_as

  auth_users {
    uuid id PK
    string email
  }

  profiles {
    uuid id PK
    string full_name
    int age
    string educational_background
    string avatar_url
    string role
    boolean is_active
  }

  courses {
    uuid id PK
    uuid created_by FK
    string title
    text description
    string cover_file_url
    string cover_file_type
    numeric price
    timestamptz created_at
  }

  sub_lessons {
    uuid id PK
    uuid course_id FK
    string title
    text description
    int sort_order
    boolean is_preview
  }

  materials {
    uuid id PK
    uuid course_id FK
    uuid sub_lesson_id FK
    string name
    string file_url
    string file_type
    text content
  }

  wishlists {
    uuid id PK
    uuid user_id FK
    uuid course_id FK
    timestamptz created_at
  }

  enrollments {
    uuid id PK
    uuid user_id FK
    uuid course_id FK
    timestamptz subscribed_at
    timestamptz completed_at
  }

  assignments {
    uuid id PK
    uuid course_id FK
    uuid sub_lesson_id FK
    string title
    text description
    timestamptz start_at
    timestamptz end_at
  }

  submissions {
    uuid id PK
    uuid assignment_id FK
    uuid user_id FK
    text content
    string status
    timestamptz submitted_at
  }

  sub_lesson_progress {
    uuid id PK
    uuid user_id FK
    uuid sub_lesson_id FK
    timestamptz completed_at
  }

  reviews {
    uuid id PK
    uuid user_id FK
    uuid course_id FK
    int rating
    text comment
  }

  promo_codes {
    uuid id PK
    uuid course_id FK
    string code
    string discount_type
    numeric discount_value
    int max_redemptions
    timestamptz starts_at
    timestamptz ends_at
    boolean is_active
  }

  promo_redemptions {
    uuid id PK
    uuid promo_code_id FK
    uuid user_id FK
    uuid enrollment_id FK
  }
```

## Design rules

- `profiles.id` = `auth.users.id`.
- `profiles.role` is `student` | `admin`. `profiles.is_active` covers admin deactivation.
- Subscribe / unsubscribe is `enrollments`, not a flag on `courses`.
- Wishlist / “Will Learn” is `wishlists`, separate from enrollment. Saving a course does not subscribe the user.
- Course cover is a **file upload** to Storage, not an external URL. `cover_file_url` is the storage path; `cover_file_type` is `image` or `video`. Use one cover file per course (picture or video). Lesson PDFs/videos stay in `materials`.
- Course `price` is `numeric` (`0` = free) so promo discounts have something to apply to.
- Sub-lesson samples: `sub_lessons.is_preview`. Full sub-lesson content is gated by enrollment in app logic.
- `materials.content` holds text (or HTML) when the item is not a file. `file_url` / `file_type` stay for PDF, video, and images; unused columns stay null.
- Overdue assignment status is computed from `assignments.end_at`, not stored.
- Analytics are queries over enrollments / progress / submissions — no extra fact table.

## Cardinality

- One profile per auth user.
- A course has many sub-lessons. Materials always belong to a **course**, and optionally a **sub-lesson** (`sub_lesson_id` null = course-level file).
- Wishlist is unique `(user_id, course_id)`.
- Enrollment is unique `(user_id, course_id)`. `completed_at` is set when all sub-lessons are done — that unlocks reviews.
- Submission is unique `(assignment_id, user_id)`. `status` is `in_progress` | `submitted`.
- Progress is unique `(user_id, sub_lesson_id)`. Course % = completed sub-lessons / total sub-lessons.
- Review is unique `(user_id, course_id)`.
- Promo `course_id` null = applies to any course. One redemption row per use, tied to the enrollment it discounted.

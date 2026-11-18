# Functional Requirements — Notification Deletion and Invite-Instructor Profile Modal

Source: `RocketLabs_Main table_11-16-2026_11-20-04-pm.csv`
Scope: functionality added in the current working tree (uncommitted changes)
ID convention: continues the existing sequence — Instructor `IN-091+`, Admin `AD-100+`.

## Placement in the RocketLabs table

| ID | Group | Parent section | Parent ID |
| --- | --- | --- | --- |
| IN-091 … IN-093 | Instructor Components | 04 REVIEWED DOCUMENT FUNCTIONALITIES | 8149287 |
| AD-100 … AD-101 | Admin Components | 04 REVIEW FUNCTIONALITIES | 8149170 |
| AD-102 … AD-103 | Admin Components | 01 USER ACCOUNTS AND ACCESS | 8149004 |

---

## IN-091 — Delete a single notification

**Requirement.** Instructor should be able to delete a single notification from the Notifications page after confirming the action.

**Preconditions.**
- The instructor is authenticated.
- At least one notification exists for the instructor.

**Behavior.**
1. Each notification row displays a delete (trash) icon.
2. Selecting the icon opens a confirmation dialog titled "Delete this notification?".
3. Confirming sends `DELETE /api/notifications/:id`.
4. On success, the row is removed from the list without a page reload.
5. Cancelling closes the dialog and leaves the notification unchanged.
6. Selecting the delete icon does not open the notification's action link.

**Acceptance criteria.**
- A notification belonging to the instructor is permanently removed.
- A request for a notification owned by another user returns `404` and deletes nothing.
- A failed request leaves the row in place.

**Implementation.** `server/controllers/notificationController.js` (`deleteNotification`), `server/routes/notificationRoutes.js`, `client/src/api/notifications.js`, `client/src/pages/instructors/InstructorNotifications.jsx`.

---

## IN-092 — Delete all notifications

**Requirement.** Instructor should be able to delete all of their notifications at once after confirming the action.

**Preconditions.**
- The instructor is authenticated.
- At least one notification exists.

**Behavior.**
1. A "Delete all" button is shown next to "Mark all as read" only when notifications exist.
2. Selecting it opens a confirmation dialog titled "Delete all notifications?".
3. Confirming sends `DELETE /api/notifications/clear-all`.
4. On success, the list becomes empty and the empty state is displayed.

**Acceptance criteria.**
- Only notifications owned by the authenticated instructor are deleted.
- The empty state ("No notifications in this category.") renders after deletion.
- Cancelling performs no deletion.

**Implementation.** Same files as IN-091 (`clearAll`).

---

## IN-093 — Unread badge reflects deletion

**Requirement.** Instructor should see the unread notification count in the layout update immediately after deleting an unread notification.

**Behavior.**
1. After a single deletion, the page dispatches a `notification-deleted` event with the notification's unread state.
2. When the deleted notification was unread, the layout decrements the unread badge without waiting for the 60-second poll.
3. Deleting all notifications resets the unread badge to zero.

**Acceptance criteria.**
- Deleting an unread notification reduces the badge by one.
- Deleting a read notification leaves the badge unchanged.
- The badge never displays a negative value.

**Implementation.** `client/src/components/layout/AppLayout.jsx`.

---

## AD-100 — Delete a single notification

**Requirement.** Admin/Dean should be able to delete a single notification from the Notifications page after confirming the action.

**Preconditions.**
- The administrator is authenticated.
- At least one notification exists for the administrator.

**Behavior.** Identical to IN-091, applied to the admin Notifications page.

**Acceptance criteria.**
- A notification belonging to the administrator is permanently removed.
- Deleting from the row does not trigger the "View" action.
- A request for a notification owned by another user returns `404`.

**Implementation.** `client/src/pages/admin/AdminNotifications.jsx` with the same server routes as IN-091.

---

## AD-101 — Delete all notifications

**Requirement.** Admin/Dean should be able to delete all of their notifications at once after confirming the action.

**Behavior.** Identical to IN-092, applied to the admin Notifications page.

**Acceptance criteria.**
- Only the authenticated administrator's notifications are deleted.
- The empty state renders after deletion.

**Implementation.** Same files as AD-100.

---

## AD-102 — Open an instructor profile from Invite Instructors

**Requirement.** Admin should be able to open an instructor's profile in a modal from the Invite Instructors page without leaving the page.

**Preconditions.**
- The administrator is authenticated.
- The invitation has status `Accepted` and the account status is `Active`.

**Behavior.**
1. Selecting anywhere on an eligible row opens the instructor profile modal.
2. The "View Profile" action opens the same modal.
3. The modal displays the same content as the modal used on the View Instructors page.
4. Closing the modal returns focus to the Invite Instructors page with filters and page position preserved.
5. Rows that are not eligible (e.g. Pending) remain non-interactive.

**Acceptance criteria.**
- The browser does not navigate away from `/admin/invite-instructor`.
- The modal matches the View Instructors behavior and layout.
- `Escape`, the close button, and the backdrop all close the modal.

**Implementation.** `client/src/pages/admin/InviteInstructor.jsx`, `client/src/components/admin/InstructorProfileModal.jsx`.

---

## AD-103 — Status changes from the invite-profile modal

**Requirement.** Admin should be able to change an instructor's account status from the profile modal opened via the Invite Instructors page, and see the result reflected in the invitations table.

**Behavior.**
1. Deactivating or reactivating inside the modal updates the invitations table without a reload.
2. The open modal reflects the new status immediately.
3. The change persists after closing and reopening the modal.

**Acceptance criteria.**
- The invitation row's `accountStatus` matches the new value.
- No full page reload is required.

**Implementation.** `onStatusUpdated` handler in `client/src/pages/admin/InviteInstructor.jsx`.

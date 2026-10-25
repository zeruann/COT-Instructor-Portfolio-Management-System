import { User } from 'lucide-react';

/**
 * Circular avatar with a light peach background and an orange person icon.
 * Matches the instructor card avatar style.
 *
 * Props:
 *  size      – Tailwind size classes, default "w-14 h-14"
 *  iconSize  – pixel size passed to the User icon, default 24
 */
function InstructorAvatar({ size = 'w-14 h-14', iconSize = 24 }) {
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-orange-50`}
      aria-hidden="true"
    >
      <User size={iconSize} className="text-orange-400" strokeWidth={1.8} />
    </span>
  );
}

export default InstructorAvatar;

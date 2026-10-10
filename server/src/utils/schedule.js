// Turns a course's weekly recurring `schedule` (see Course.schedule) into a concrete
// next-occurrence Date, relative to "now". Used to build "Next class" / "This week" views
// without needing a separate calendar-events collection.
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function nextOccurrence(slot, now = new Date()) {
  const [h, m] = slot.startTime.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  let diffDays = (DAY_INDEX[slot.day] - now.getDay() + 7) % 7;
  if (diffDays === 0 && target <= now) diffDays = 7; // today's slot already started/ended
  target.setDate(target.getDate() + diffDays);
  return target;
}

// The soonest upcoming class across every slot of every given course. Each returned item
// carries the course it belongs to, so the dashboard can link straight to it.
function nextClassesForCourses(courses, now = new Date()) {
  const items = [];
  for (const course of courses) {
    for (const slot of course.schedule || []) {
      items.push({ course, slot, at: nextOccurrence(slot, now) });
    }
  }
  return items.sort((a, b) => a.at - b.at);
}

module.exports = { nextOccurrence, nextClassesForCourses };

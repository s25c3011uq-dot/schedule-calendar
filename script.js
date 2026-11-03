/* =========================
   スケジュール帳
========================= */

const calendarTitle = document.getElementById("calendarTitle");
const currentTime = document.getElementById("currentTime");
const eventSearchInput = document.getElementById("eventSearchInput");
const eventSearchResults = document.getElementById("eventSearchResults");

function updateCurrentTime() {
  const now = new Date();

  currentTime.textContent = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(now);
}

updateCurrentTime();
setInterval(updateCurrentTime, 1000);

const monthView = document.getElementById("monthView");
const weekView = document.getElementById("weekView");
const dayView = document.getElementById("dayView");

const monthGrid = document.getElementById("monthGrid");
const monthEventListContents = document.getElementById("monthEventListContents");
const selectedMonthDateTitle = document.getElementById("selectedMonthDateTitle");
const selectedMonthDateList = document.getElementById("selectedMonthDateList");
const addEventToSelectedMonthDate = document.getElementById("addEventToSelectedMonthDate");
const weekContainer = document.getElementById("weekContainer");
const weekEventListContents = document.getElementById("weekEventListContents");
const selectedHourTitle = document.getElementById("selectedHourTitle");
const selectedHourEventContents = document.getElementById("selectedHourEventContents");
const addEventFromSelectedHour = document.getElementById("addEventFromSelectedHour");
const dayTimeGrid = document.getElementById("dayTimeGrid");
const dayDate = document.getElementById("dayDate");
let selectedWeekSlot = null;
let selectedMonthDateKey = null;
let selectedMonthCalendarGenres = null;
let selectedWeekCalendarGenres = null;

dayDate.addEventListener("change", () => {
  if (!dayDate.value) return;
  currentDate = new Date(`${dayDate.value}T00:00:00`);
  render();
});

addEventToSelectedMonthDate.addEventListener("click", () => {
  if (!selectedMonthDateKey) return;
  openEventModal(selectedMonthDateKey, "09:00");
});

addEventFromSelectedHour.addEventListener("click", () => {
  openEventModal(getDateKey(currentDate), "09:00");
});

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const todayBtn = document.getElementById("todayBtn");

const viewButtons =
  document.querySelectorAll(".view-switch button");
const connectorColorInput = document.getElementById("connectorColor");
const selectedLineLabel = document.getElementById("selectedLineLabel");


/* =========================
   状態
========================= */

let currentDate = new Date();

let currentView = "month";

let editingEventId = null;
let selectedConnectorEventId = null;


/*
  現在はメモリ上に保存。

  次の段階で localStorage に変更すれば
  ブラウザを閉じても保存できる。
*/
let events = JSON.parse(localStorage.getItem("scheduleEvents")) || [];
let eventTitleHistory = JSON.parse(localStorage.getItem("scheduleEventTitleHistory") || "[]");
if (!Array.isArray(eventTitleHistory)) eventTitleHistory = [];
events.forEach(item => {
  const title = (item.title || "").trim();
  if (title && !eventTitleHistory.includes(title)) eventTitleHistory.push(title);
});
localStorage.setItem("scheduleEventTitleHistory", JSON.stringify(eventTitleHistory));

let eventTemplateHistory = JSON.parse(localStorage.getItem("scheduleEventTemplateHistory") || "[]");
if (!Array.isArray(eventTemplateHistory)) eventTemplateHistory = [];
events.forEach(item => {
  const template = makeEventTemplate(item);
  const key = eventTemplateKey(template);
  if (template.title && !eventTemplateHistory.some(saved => eventTemplateKey(saved) === key)) {
    eventTemplateHistory.push(template);
  }
});
eventTemplateHistory = eventTemplateHistory.slice(-100);
localStorage.setItem("scheduleEventTemplateHistory", JSON.stringify(eventTemplateHistory));

function makeEventTemplate(item) {
  const startDate = new Date(`${item.date}T00:00:00`);
  const endDate = new Date(`${getEventEndDate(item)}T00:00:00`);
  return {
    title: (item.title || "").trim(),
    time: item.time || "",
    endTime: getEventEndTime(item) || "",
    genre: item.genre || "",
    endDayOffset: Math.max(0, Math.round((endDate - startDate) / 86400000))
  };
}

function eventTemplateKey(template) {
  return [template.title, template.time, template.endTime, template.endDayOffset || 0, template.genre || ""].join("|");
}

eventSearchInput.addEventListener("input", renderEventSearchResults);
eventSearchInput.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    eventSearchInput.value = "";
    renderEventSearchResults();
    eventSearchInput.blur();
  }
});

document.addEventListener("click", event => {
  if (!event.target.closest(".event-search")) {
    eventSearchResults.classList.add("hidden");
  }
});

function renderEventSearchResults() {
  const query = eventSearchInput.value.trim().toLocaleLowerCase();
  eventSearchResults.innerHTML = "";

  if (!query) {
    eventSearchResults.classList.add("hidden");
    return;
  }

  const matches = events
    .filter(item => `${item.title || ""}\n${item.memo || ""}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "event-search-empty";
    empty.textContent = "一致する予定はありません";
    eventSearchResults.appendChild(empty);
  } else {
    matches.forEach(item => {
      const result = document.createElement("button");
      result.type = "button";
      result.className = "event-search-result";
      result.setAttribute("role", "option");

      const title = document.createElement("span");
      title.className = "event-search-result-title";
      title.textContent = item.title || "（タイトルなし）";

      const details = document.createElement("span");
      details.className = "event-search-result-details";
      details.textContent = `${item.date} ${item.time} ～ ${getEventEndDate(item)} ${getEventEndTime(item)}`;

      result.append(title, details);
      if (item.memo) {
        const memo = document.createElement("span");
        memo.className = "event-search-result-memo";
        memo.textContent = item.memo;
        result.appendChild(memo);
      }

      result.addEventListener("click", () => {
        currentDate = new Date(`${item.date}T00:00:00`);
        selectedMonthDateKey = item.date;
        currentView = "month";
        render();
        eventSearchResults.classList.add("hidden");
        openEditModal(item.id);
      });

      eventSearchResults.appendChild(result);
    });
  }

  eventSearchResults.classList.remove("hidden");
}

function persistEvents() {
  localStorage.setItem("scheduleEvents", JSON.stringify(events));
}

connectorColorInput.addEventListener("input", () => {
  const event = events.find(item => item.id === selectedConnectorEventId);
  if (!event) return;

  event.lineColor = connectorColorInput.value;
  persistEvents();
  render();
});

function updateCurrentTime() {
  const now = new Date();
  currentTime.textContent = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(now);
}

updateCurrentTime();
setInterval(updateCurrentTime, 1000);


/* =========================
   日付関連
========================= */

function pad(number) {
  return String(number).padStart(2, "0");
}


function getDateKey(date) {

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  );

}


function formatDate(date) {

  return (
    date.getFullYear() +
    "年" +
    (date.getMonth() + 1) +
    "月" +
    date.getDate() +
    "日"
  );

}


function isSameDate(a, b) {

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );

}

function getEventEndDate(event) {
  return event.endDate || event.date;
}

function getEventEndTime(event) {
  return event.endTime || event.time;
}

function eventOccursOnDate(event, date) {
  const key = getDateKey(date);
  return event.date <= key && getEventEndDate(event) >= key;
}

function eventHourOnDate(event, date) {
  return getDateKey(date) === event.date
    ? Number(event.time.substring(0, 2))
    : 0;
}


/* =========================
   月表示
========================= */

function renderMonth() {

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthPrefix = `${year}-${pad(month + 1)}-`;
  if (!selectedMonthDateKey || !selectedMonthDateKey.startsWith(monthPrefix)) {
    selectedMonthDateKey = getDateKey(currentDate);
  }

  calendarTitle.textContent =
    `${year}年${month + 1}月`;


  monthGrid.innerHTML = "";


  const firstDay =
    new Date(year, month, 1);


  const startDate =
    new Date(
      year,
      month,
      1 - firstDay.getDay()
    );


  const today = new Date();


  const monthMultiDayEvents = events.filter(event =>
    getEventEndDate(event) > event.date && matchesMonthCalendarGenre(event)
  );

  for (let week = 0; week < 6; week++) {
    const weekRow = document.createElement("div");
    weekRow.className = "month-week-row";

    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + week * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartKey = getDateKey(weekStart);
    const weekEndKey = getDateKey(weekEnd);

    const rowEvents = monthMultiDayEvents
      .filter(event => event.date <= weekEndKey && getEventEndDate(event) >= weekStartKey)
      .sort((a, b) => a.date.localeCompare(b.date) || getEventEndDate(a).localeCompare(getEventEndDate(b)));
    const occupiedLanes = [];
    const segments = rowEvents.map(event => {
      const segmentStart = event.date < weekStartKey ? weekStartKey : event.date;
      const eventEndDate = getEventEndDate(event);
      const segmentEnd = eventEndDate > weekEndKey ? weekEndKey : eventEndDate;
      const startColumn = Math.round((new Date(`${segmentStart}T00:00:00`) - weekStart) / 86400000);
      const endColumn = Math.round((new Date(`${segmentEnd}T00:00:00`) - weekStart) / 86400000);

      let lane = 0;
      while (occupiedLanes[lane]?.some(([start, end]) => start <= endColumn && end >= startColumn)) {
        lane++;
      }
      occupiedLanes[lane] ??= [];
      occupiedLanes[lane].push([startColumn, endColumn]);
      return { event, startColumn, endColumn, lane };
    });

    weekRow.style.setProperty("--month-event-lanes", String(occupiedLanes.length));

    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + day);

      const cell = document.createElement("div");
      cell.className = "month-day";
      const dateKey = getDateKey(date);
      if (dateKey === selectedMonthDateKey) cell.classList.add("selected");
      if (date.getMonth() !== month) cell.classList.add("other-month");
      if (isSameDate(date, today)) cell.classList.add("today");

      const number = document.createElement("div");
      number.className = "day-number";
      number.textContent = date.getDate();
      cell.appendChild(number);

      const dateEvents = events
        .filter(event => eventOccursOnDate(event, date) && getEventEndDate(event) === event.date && matchesMonthCalendarGenre(event))
        .sort((a, b) => a.time.localeCompare(b.time));

      const eventList = document.createElement("div");
      eventList.className = "month-day-events";
      dateEvents.forEach(event => eventList.appendChild(createEventElement(event)));
      cell.appendChild(eventList);

      cell.addEventListener("click", () => {
        selectedMonthDateKey = dateKey;
        if (date.getMonth() !== month || date.getFullYear() !== year) {
          currentDate = new Date(date);
        }
        render();
      });

      weekRow.appendChild(cell);
    }

    const eventLayer = document.createElement("div");
    eventLayer.className = "month-week-events";
    segments.forEach(({ event, startColumn, endColumn, lane }) => {
      const bar = document.createElement("button");
      bar.type = "button";
      bar.className = "month-multiday-event";
      bar.style.gridColumn = `${startColumn + 1} / ${endColumn + 2}`;
      bar.style.gridRow = String(lane + 1);
      bar.style.backgroundColor = event.barColor || event.lineColor || "#64748b";
      bar.textContent = event.title;
      bar.title = `${event.title}：${event.date} ${event.time} ～ ${getEventEndDate(event)} ${getEventEndTime(event)}`;
      bar.addEventListener("click", clickEvent => {
        clickEvent.stopPropagation();
        openEditModal(event.id);
      });
      eventLayer.appendChild(bar);
    });
    weekRow.appendChild(eventLayer);
    monthGrid.appendChild(weekRow);
  }

  const monthStart = getDateKey(new Date(year, month, 1));
  const monthEnd = getDateKey(new Date(year, month + 1, 0));
  const monthlyEvents = events
    .filter(event => event.date <= monthEnd && getEventEndDate(event) >= monthStart)
    .sort((a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
  renderGenreEventList(
    monthEventListContents,
    monthlyEvents,
    "今月の予定はありません",
    true,
    genres => {
      selectedMonthCalendarGenres = genres ? new Set(genres) : null;
      renderMonth();
    }
  );
  renderSelectedMonthDateEvents();

}

function renderSelectedMonthDateEvents() {
  const selectedDate = new Date(`${selectedMonthDateKey}T00:00:00`);
  selectedMonthDateTitle.textContent = `${formatDate(selectedDate)}の予定`;

  const dayEvents = events
    .filter(event => eventOccursOnDate(event, selectedDate))
    .sort((a, b) => {
      const aTime = a.date < selectedMonthDateKey ? "00:00" : a.time;
      const bTime = b.date < selectedMonthDateKey ? "00:00" : b.time;
      return aTime.localeCompare(bTime);
    });

  selectedMonthDateList.innerHTML = "";
  if (dayEvents.length === 0) {
    selectedMonthDateList.innerHTML =
      '<p class="week-event-empty">この日の予定はありません</p>';
    return;
  }

  const items = document.createElement("div");
  items.className = "genre-event-items";
  dayEvents.forEach(event => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "week-event-item";
    item.innerHTML = `
      <span class="week-event-item-title">${escapeHtml(event.title)}</span>
      <span class="week-event-item-time">${escapeHtml(event.date)} ${escapeHtml(event.time)} ～ ${escapeHtml(getEventEndDate(event))} ${escapeHtml(getEventEndTime(event))}</span>
    `;
    item.addEventListener("click", () => openEditModal(event.id));
    items.appendChild(item);
  });
  selectedMonthDateList.appendChild(items);
}


/* =========================
   週の開始日
========================= */

function getWeekStart(date) {

  const result =
    new Date(date);

  result.setDate(
    result.getDate() -
    result.getDay()
  );

  return result;

}


/* =========================
   週表示
========================= */

function renderWeek() {

  const weekStart =
    getWeekStart(currentDate);


  const weekEnd =
    new Date(weekStart);

  weekEnd.setDate(
    weekStart.getDate() + 6
  );


  calendarTitle.textContent =
    `${formatDate(weekStart)} ～ ${formatDate(weekEnd)}`;


  weekContainer.innerHTML = "";


  const dayNames = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ];


  const today =
    new Date();


  /*
    7日分作成
  */

  for (let day = 0; day < 7; day++) {

    const date =
      new Date(weekStart);

    date.setDate(
      weekStart.getDate() + day
    );


    const column =
      document.createElement("div");

    column.className =
      "week-column";
      
    column.dataset.date = getDateKey(date);

    if (isSameDate(date, today)) {

      column.classList.add("today");

    }


    /*
      日付ヘッダー
    */

    const header =
      document.createElement("div");

    header.className =
      "week-day-header";


    header.innerHTML = `
      <div class="week-day-name">
        ${dayNames[date.getDay()]}
      </div>

      <div class="week-day-number">
        ${date.getDate()}
      </div>
    `;


    header.addEventListener(
      "click",
      () => {

        openEventModal(
          getDateKey(date),
          "09:00"
        );

      }
    );


    column.appendChild(header);


    /*
      時間エリア
    */

    const timeArea =
      document.createElement("div");

    timeArea.className =
      "time-area";


    /*
      0時～23時
    */

    for (let hour = 0; hour < 24; hour++) {

      const line =
        document.createElement("div");

      line.className =
        "hour-line";

      const dateKey = getDateKey(date);
      const startCount = events.filter(event =>
        matchesWeekCalendarGenre(event) && event.date === dateKey && Number(event.time.substring(0, 2)) === hour
      ).length;

      line.innerHTML = `
        <button type="button" class="hour-label" aria-label="${formatDate(date)} ${pad(hour)}時台に始まる予定${startCount}件を表示">
          ${pad(hour)}:00
          ${startCount > 0 ? `<span class="hour-event-count">${startCount}件</span>` : ""}
        </button>
        <div class="hour-line-events"></div>
      `;

      const eventList = line.querySelector(".hour-line-events");
      line.querySelector(".hour-label").addEventListener("click", event => {
        event.stopPropagation();
        selectedWeekSlot = { dateKey: getDateKey(date), hour };
        renderSelectedWeekHourEvents();
      });


      /*
        時間をクリック
      */

      line.addEventListener(
        "click",
        () => {

          openEventModal(
            getDateKey(date),
            `${pad(hour)}:00`
          );

        }
      );


      /*
        その時間の予定
      */

      const hourEvents =
        events
          .filter(event => {
            if (!matchesWeekCalendarGenre(event)) return false;
            const startsInThisHour =
              event.date === dateKey &&
              Number(event.time.substring(0, 2)) === hour;
            const endsInThisHour =
              getEventEndDate(event) === dateKey &&
              Number(getEventEndTime(event).substring(0, 2)) === hour;

            return startsInThisHour || endsInThisHour;
          })
          .sort((a, b) =>
            a.time.localeCompare(b.time)
          );


      hourEvents.forEach(event => {
        const startsInThisHour =
          event.date === dateKey &&
          Number(event.time.substring(0, 2)) === hour;
        const endsInThisHour =
          getEventEndDate(event) === dateKey &&
          Number(getEventEndTime(event).substring(0, 2)) === hour;

        if (startsInThisHour) {
          eventList.appendChild(createEventElement(event, "start"));
        }

        if (endsInThisHour) {
          eventList.appendChild(createEventElement(event, "end"));
        }
      });


      timeArea.appendChild(line);

    }


    column.appendChild(timeArea);

    weekContainer.appendChild(column);

  }
  drawEventConnectors();
  renderWeekEventList(weekStart, weekEnd);
  if (
    selectedWeekSlot &&
    (selectedWeekSlot.dateKey < getDateKey(weekStart) || selectedWeekSlot.dateKey > getDateKey(weekEnd))
  ) {
    selectedWeekSlot = null;
  }
  renderSelectedWeekHourEvents();
}

function renderSelectedWeekHourEvents() {
  if (!selectedWeekSlot) {
    selectedHourTitle.textContent = "この時間帯に始まる予定";
    selectedHourEventContents.innerHTML =
      '<p class="week-event-empty">左の時間を選ぶと予定を表示します</p>';
    return;
  }

  const { dateKey, hour } = selectedWeekSlot;
  const selectedDate = new Date(`${dateKey}T00:00:00`);
  selectedHourTitle.textContent =
    `${formatDate(selectedDate)} ${pad(hour)}時台に始まる予定`;

  const matchingEvents = events
    .filter(event =>
      matchesWeekCalendarGenre(event) && event.date === dateKey && Number(event.time.substring(0, 2)) === hour
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  selectedHourEventContents.innerHTML = "";
  if (matchingEvents.length === 0) {
    selectedHourEventContents.innerHTML =
      '<p class="week-event-empty">この時間に始まる予定はありません</p>';
    return;
  }

  const items = document.createElement("div");
  items.className = "genre-event-items";
  matchingEvents.forEach(event => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "week-event-item";
    item.innerHTML = `
      <span class="week-event-item-title">${escapeHtml(event.title)}</span>
      <span class="week-event-item-time">${escapeHtml(event.time)} ～ ${getEventEndDate(event) === event.date ? "" : `${escapeHtml(getEventEndDate(event))} `}${escapeHtml(getEventEndTime(event))}</span>
    `;
    item.addEventListener("click", () => openEditModal(event.id));
    items.appendChild(item);
  });
  selectedHourEventContents.appendChild(items);
}

function renderWeekEventList(weekStart, weekEnd) {
  const startKey = getDateKey(weekStart);
  const endKey = getDateKey(weekEnd);
  const weeklyEvents = events
    .filter(event => event.date <= endKey && getEventEndDate(event) >= startKey)
    .sort((a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
  renderGenreEventList(
    weekEventListContents,
    weeklyEvents,
    "今週の予定はありません",
    true,
    genres => {
      selectedWeekCalendarGenres = genres ? new Set(genres) : null;
      renderWeek();
    }
  );
}

function eventDisplayGenre(event) {
  const genreOrder = ["学校", "課題", "部活", "バイト", "遊び", "その他"];
  return genreOrder.includes(event.genre) ? event.genre : "その他";
}

function matchesMonthCalendarGenre(event) {
  return !selectedMonthCalendarGenres || selectedMonthCalendarGenres.has(eventDisplayGenre(event));
}

function matchesWeekCalendarGenre(event) {
  return !selectedWeekCalendarGenres || selectedWeekCalendarGenres.has(eventDisplayGenre(event));
}

function renderGenreEventList(container, listedEvents, emptyMessage, allowCollapse = false, onGenreSelect = null) {
  const genreOrder = ["学校", "課題", "部活", "バイト", "遊び", "その他"];
  const groupedEvents = new Map(genreOrder.map(genre => [genre, []]));

  listedEvents.forEach(event => {
    const genre = eventDisplayGenre(event);
    groupedEvents.get(genre).push(event);
  });

  const firstGenreWithEvents = genreOrder.find(genre => groupedEvents.get(genre).length > 0);
  const isMultiSelect = typeof onGenreSelect === "function";
  const hasClickedGenre = container.dataset.hasClickedGenre === "true";
  const savedGenres = isMultiSelect && container.dataset.selectedGenres
    ? JSON.parse(container.dataset.selectedGenres)
    : null;
  const selectedGenres = isMultiSelect
    ? savedGenres || (hasClickedGenre && container.dataset.selectedGenre === "__closed__"
      ? []
      : [container.dataset.selectedGenre || firstGenreWithEvents || genreOrder[0]])
    : container.dataset.selectedGenre === "__closed__"
      ? []
      : [container.dataset.selectedGenre || firstGenreWithEvents || genreOrder[0]];
  const isGenreListClosed = selectedGenres.length === 0 && hasClickedGenre;
  const selectedGenre = selectedGenres[0] || null;
  if (!isGenreListClosed && selectedGenre) {
    container.dataset.selectedGenre = selectedGenre;
  }
  container.innerHTML = "";

  const tabs = document.createElement("div");
  tabs.className = "genre-tabs";
  tabs.setAttribute("role", "tablist");

  genreOrder.forEach(genre => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `genre-tab${selectedGenres.includes(genre) ? " active" : ""}`;
    tab.textContent = `${genre} (${groupedEvents.get(genre).length})`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(selectedGenres.includes(genre)));
    tab.addEventListener("click", () => {
      container.dataset.hasClickedGenre = "true";
      if (isMultiSelect) {
        const activeGenres = new Set(selectedGenres);
        if (activeGenres.has(genre) && hasClickedGenre) activeGenres.delete(genre);
        else activeGenres.add(genre);
        const nextGenres = genreOrder.filter(item => activeGenres.has(item));
        container.dataset.selectedGenres = JSON.stringify(nextGenres);
        container.dataset.selectedGenre = nextGenres[0] || "__closed__";
        onGenreSelect(nextGenres.length ? nextGenres : null);
        return;
      }
      const willClose = allowCollapse && genre === selectedGenre;
      container.dataset.selectedGenre = willClose
        ? "__closed__"
        : genre;
      renderGenreEventList(container, listedEvents, emptyMessage, allowCollapse);
    });
    tabs.appendChild(tab);
  });
  container.appendChild(tabs);

  if (isGenreListClosed) {
    return;
  }

  const selectedEvents = genreOrder
    .filter(genre => selectedGenres.includes(genre))
    .flatMap(genre => groupedEvents.get(genre));
  if (selectedEvents.length === 0) {
    const message = document.createElement("p");
    message.className = "week-event-empty";
    message.textContent = listedEvents.length === 0
      ? emptyMessage
      : `${selectedGenre}の予定はありません`;
    container.appendChild(message);
    return;
  }

  const items = document.createElement("div");
  items.className = "genre-event-items";
  selectedEvents.forEach(event => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "week-event-item";
    item.innerHTML = `
      <span class="week-event-item-title">${escapeHtml(event.title)}</span>
      <span class="week-event-item-time">${event.date} ${event.time} ～ ${getEventEndDate(event)} ${getEventEndTime(event)}</span>
    `;
    item.addEventListener("click", () => openEditModal(event.id));
    items.appendChild(item);
  });
  container.appendChild(items);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function drawEventConnectors() {
  weekContainer.querySelector(".event-connectors")?.remove();

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");

  svg.classList.add("event-connectors");
  svg.setAttribute("width", weekContainer.scrollWidth);
  svg.setAttribute("height", weekContainer.scrollHeight);

  const gridRect = weekContainer.getBoundingClientRect();
  const startHeightsByStartSlot = new Map();
  const occupiedLineRanges = [];
  const lineLaneByEvent = new Map();

  const connectorEvents = events.filter(event => {
    if (!matchesWeekCalendarGenre(event)) return false;
    const startColumn = weekContainer.querySelector(
      `[data-date="${event.date}"]`
    );
    const endColumn = weekContainer.querySelector(
      `[data-date="${getEventEndDate(event)}"]`
    );
    return startColumn && endColumn &&
      startColumn.querySelector(`[data-event-id="${event.id}"][data-event-endpoint="start"]`) &&
      endColumn.querySelector(`[data-event-id="${event.id}"][data-event-endpoint="end"]`);
  });

  connectorEvents.forEach(event => {
    const startSlotKey = `${event.date}-${event.time.substring(0, 2)}`;
    const start = new Date(`${event.date}T${event.time}:00`).getTime();
    const endDateKey = getEventEndDate(event);
    const end = new Date(`${endDateKey}T${getEventEndTime(event)}:00`).getTime();

    let lane = 0;
    while (
      occupiedLineRanges[lane]?.some(range =>
        range.startSlotKey === startSlotKey || (start < range.end && end > range.start)
      )
    ) {
      lane += 1;
    }

    if (!occupiedLineRanges[lane]) occupiedLineRanges[lane] = [];
    occupiedLineRanges[lane].push({ start, end, startSlotKey });
    lineLaneByEvent.set(event, lane);
  });

  connectorEvents.forEach(event => {
    const endDateKey = getEventEndDate(event);
    const firstDate = new Date(`${event.date}T00:00:00`);
    const lastDate = new Date(`${endDateKey}T00:00:00`);
    const startColumn = weekContainer.querySelector(
      `[data-date="${event.date}"]`
    );
    const endColumn = weekContainer.querySelector(
      `[data-date="${endDateKey}"]`
    );

    if (!startColumn || !endColumn) return;

    const startCard = startColumn.querySelector(
      `[data-event-id="${event.id}"][data-event-endpoint="start"]`
    );
    const endCard = endColumn.querySelector(
      `[data-event-id="${event.id}"][data-event-endpoint="end"]`
    );

    if (!startCard || !endCard) return;

    const startColumnRect = startColumn.getBoundingClientRect();
    const startCardRect = startCard.getBoundingClientRect();
    const endCardRect = endCard.getBoundingClientRect();
    const startSlotKey = `${event.date}-${event.time.substring(0, 2)}`;
    if (!startHeightsByStartSlot.has(startSlotKey)) {
      startHeightsByStartSlot.set(
        startSlotKey,
        startCardRect.top - gridRect.top
      );
    }
    const alignedStartY = startHeightsByStartSlot.get(startSlotKey);
    const lineLane = lineLaneByEvent.get(event) || 0;
    const offsetX =
      startCardRect.left - startColumnRect.left + lineLane * 10;

    for (
      let date = new Date(firstDate);
      date <= lastDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dateKey = getDateKey(date);
      const column = weekContainer.querySelector(
        `[data-date="${dateKey}"]`
      );

      if (!column) continue;

      const timeArea = column.querySelector(".time-area");
      const columnRect = column.getBoundingClientRect();
      const timeAreaRect = timeArea.getBoundingClientRect();

      const startMinute =
        dateKey === event.date
          ? timeToMinutes(event.time)
          : 0;

      const endMinute =
        dateKey === endDateKey
          ? timeToMinutes(getEventEndTime(event))
          : 24 * 60;

      const x = columnRect.left - gridRect.left + offsetX;

      let y1 =
        timeAreaRect.top -
        gridRect.top +
        startMinute;

      let y2 =
        timeAreaRect.top -
        gridRect.top +
        endMinute;

      if (dateKey === event.date) {
        y1 = alignedStartY;
      }

      if (dateKey === endDateKey) {
        y2 = endCardRect.top - gridRect.top;
      }

      const line = document.createElementNS(svgNS, "line");

      line.setAttribute("x1", x);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", event.lineColor || "#2563ed");
      line.setAttribute(
        "stroke-width",
        event.id === selectedConnectorEventId ? "4" : "2"
      );
      line.dataset.eventId = event.id;
      line.setAttribute("aria-label", `${event.title}の予定線`);
      line.addEventListener("click", () => {
        selectedConnectorEventId = event.id;
        connectorColorInput.disabled = false;
        connectorColorInput.value = event.lineColor || "#2563ed";
        selectedLineLabel.textContent = event.title;
        render();
      });

      svg.appendChild(line);
    }
  });

  weekContainer.appendChild(svg);
}

/* =========================
   日表示
========================= */

function renderDay() {

  calendarTitle.textContent =
    formatDate(currentDate);


  dayDate.value =
    getDateKey(currentDate);


  dayTimeGrid.innerHTML = "";
  const dateKey = getDateKey(currentDate);
  const dayEvents = events.filter(event => eventOccursOnDate(event, currentDate));


  for (let hour = 0; hour < 24; hour++) {

    const line =
      document.createElement("div");

    line.className =
      "day-hour";


    line.innerHTML = `
      <span class="day-hour-label">
        ${pad(hour)}:00
      </span>
    `;


    line.addEventListener(
      "click",
      () => {

        openEventModal(
          getDateKey(currentDate),
          `${pad(hour)}:00`
        );

      }
    );


    const hourEventCards = [];
    dayEvents.forEach(event => {
      if (event.date === dateKey && Number(event.time.substring(0, 2)) === hour) {
        hourEventCards.push({ event, endpoint: "start", sortTime: event.time });
      }
      if (getEventEndDate(event) === dateKey && Number(getEventEndTime(event).substring(0, 2)) === hour) {
        hourEventCards.push({ event, endpoint: "end", sortTime: getEventEndTime(event) });
      }
    });
    hourEventCards.sort((a, b) => a.sortTime.localeCompare(b.sortTime));

    hourEventCards.forEach(({ event, endpoint }) => {
      line.appendChild(createEventElement(event, endpoint));
    });

    // 予定カードが複数ある時間マスは、カードが重ならない高さに広げる
    line.style.height = `${Math.max(60, hourEventCards.length * 48 + 10)}px`;


    dayTimeGrid.appendChild(line);

  }

  drawDayConnectors(dayEvents, dateKey);

}

function drawDayConnectors(dayEvents, dateKey) {
  dayTimeGrid.querySelector(".event-connectors")?.remove();

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.classList.add("event-connectors");
  svg.setAttribute("width", dayTimeGrid.scrollWidth);
  svg.setAttribute("height", dayTimeGrid.scrollHeight);

  const gridRect = dayTimeGrid.getBoundingClientRect();
  const occupiedLineRanges = [];
  const lineLaneByEvent = new Map();

  [...dayEvents]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .forEach(event => {
      const start = new Date(`${event.date}T${event.time}:00`).getTime();
      const end = new Date(`${getEventEndDate(event)}T${getEventEndTime(event)}:00`).getTime();
      const startSlotKey = `${event.date}-${event.time.substring(0, 2)}`;
      let lane = 0;
      while (occupiedLineRanges[lane]?.some(range =>
        range.startSlotKey === startSlotKey || (start < range.end && end > range.start)
      )) {
        lane++;
      }
      occupiedLineRanges[lane] ??= [];
      occupiedLineRanges[lane].push({ start, end, startSlotKey });
      lineLaneByEvent.set(event, lane);
    });

  dayEvents.forEach(event => {
    const startCard = event.date === dateKey
      ? dayTimeGrid.querySelector(`[data-event-id="${event.id}"][data-event-endpoint="start"]`)
      : null;
    const endCard = getEventEndDate(event) === dateKey
      ? dayTimeGrid.querySelector(`[data-event-id="${event.id}"][data-event-endpoint="end"]`)
      : null;

    if (!startCard && !endCard && (event.date >= dateKey || getEventEndDate(event) <= dateKey)) return;

    const anchorCard = startCard || endCard;
    const x = (anchorCard
      ? anchorCard.getBoundingClientRect().left - gridRect.left
      : 60) + (lineLaneByEvent.get(event) || 0) * 10;

    const y1 = startCard
      ? startCard.getBoundingClientRect().top - gridRect.top
      : 0;
    const y2 = endCard
      ? endCard.getBoundingClientRect().top - gridRect.top
      : gridRect.height;

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", event.lineColor || "#2563ed");
    line.setAttribute("stroke-width", event.id === selectedConnectorEventId ? "4" : "2");
    line.dataset.eventId = event.id;
    line.setAttribute("aria-label", `${event.title}の予定線`);
    line.addEventListener("click", () => {
      selectedConnectorEventId = event.id;
      connectorColorInput.disabled = false;
      connectorColorInput.value = event.lineColor || "#2563ed";
      selectedLineLabel.textContent = event.title;
      render();
    });
    svg.appendChild(line);
  });

  dayTimeGrid.appendChild(svg);
}


/* =========================
   予定表示
========================= */

function createEventElement(event, endpoint = null) {

  const element =
    document.createElement("div");

  element.className ="event";
  element.dataset.eventId = event.id;
  if (endpoint) {
    element.dataset.eventEndpoint = endpoint;
  }


  const eventTimeHtml = endpoint
    ? `
      <span>${escapeHtml(event.time)}</span>
      <span>～ ${getEventEndDate(event) === event.date ? "" : `${escapeHtml(getEventEndDate(event))} `}${escapeHtml(getEventEndTime(event))}</span>
    `
    : `${escapeHtml(event.time)}～${getEventEndDate(event) === event.date ? "" : `${escapeHtml(getEventEndDate(event))} `}${escapeHtml(getEventEndTime(event))}`;

  element.innerHTML = `
    <div>${escapeHtml(event.title)}</div>
    <div class="event-time">${eventTimeHtml}</div>
  `;


  /*
    予定をクリックすると編集
  */

  element.addEventListener(
    "click",
    function (e) {

      e.stopPropagation();

      openEditModal(event.id);

    }
  );


  return element;

}


/* =========================
   HTMLエスケープ
========================= */

function escapeHtml(text) {

  return text.replace(
    /[&<>"']/g,
    character => {

      const map = {

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      };

      return map[character];

    }
  );

}


/* =========================
   モーダル
========================= */

const modal =
  document.getElementById("modal");

const modalTitle =
  document.getElementById("modalTitle");

const eventForm =
  document.getElementById("eventForm");

const eventTitle =
  document.getElementById("eventTitle");

const eventTitleHistoryList =
  document.getElementById("eventTitleHistory");

function renderEventTitleHistory() {
  eventTitleHistoryList.replaceChildren();
  const query = eventTitle.value.trim().toLocaleLowerCase();
  const templateTitles = new Set(eventTemplateHistory.map(item => item.title));
  const suggestions = [
    ...[...eventTemplateHistory].reverse(),
    ...[...eventTitleHistory].reverse()
      .filter(title => !templateTitles.has(title))
      .map(title => ({ title, time: "", endTime: "", genre: "", endDayOffset: 0 }))
  ].filter(item => !query || item.title.toLocaleLowerCase().includes(query)).slice(0, 12);

  suggestions.forEach(template => {
    const suggestion = document.createElement("button");
    suggestion.type = "button";
    suggestion.className = "event-title-suggestion";
    suggestion.setAttribute("role", "option");

    const title = document.createElement("span");
    title.className = "event-title-suggestion-name";
    title.textContent = template.title;
    suggestion.appendChild(title);

    if (template.time && template.endTime) {
      const times = document.createElement("span");
      times.className = "event-title-suggestion-time";
      const timeLabel = `${template.time} ～ ${template.endTime}${template.endDayOffset ? `（${template.endDayOffset}日後）` : ""}`;
      times.textContent = template.genre ? `${timeLabel}・${template.genre}` : timeLabel;
      suggestion.appendChild(times);
    } else if (template.genre) {
      const genre = document.createElement("span");
      genre.className = "event-title-suggestion-time";
      genre.textContent = template.genre;
      suggestion.appendChild(genre);
    }

    suggestion.addEventListener("mousedown", event => event.preventDefault());
    suggestion.addEventListener("click", () => {
      eventTitle.value = template.title;
      if (template.time) eventTime.value = template.time;
      if (template.endTime) eventEndTime.value = template.endTime;
      setEventGenre(template.genre || "");
      if (eventDate.value && template.endTime) {
        const endDate = new Date(`${eventDate.value}T00:00:00`);
        endDate.setDate(endDate.getDate() + (template.endDayOffset || 0));
        eventEndDate.value = getDateKey(endDate);
      }
      eventTitleHistoryList.classList.add("hidden");
      eventTitle.focus();
    });

    eventTitleHistoryList.appendChild(suggestion);
  });

  eventTitleHistoryList.classList.toggle("hidden", suggestions.length === 0);
}

function rememberEventTitle(title) {
  eventTitleHistory = eventTitleHistory.filter(item => item !== title);
  eventTitleHistory.push(title);
  eventTitleHistory = eventTitleHistory.slice(-100);
  localStorage.setItem("scheduleEventTitleHistory", JSON.stringify(eventTitleHistory));
  renderEventTitleHistory();
}

function rememberEventTemplate(eventData) {
  const template = makeEventTemplate(eventData);
  eventTemplateHistory = eventTemplateHistory.filter(saved => eventTemplateKey(saved) !== eventTemplateKey(template));
  eventTemplateHistory.push(template);
  eventTemplateHistory = eventTemplateHistory.slice(-100);
  localStorage.setItem("scheduleEventTemplateHistory", JSON.stringify(eventTemplateHistory));
  renderEventTitleHistory();
}

eventTitle.addEventListener("input", renderEventTitleHistory);
eventTitle.addEventListener("focus", renderEventTitleHistory);
document.addEventListener("click", event => {
  if (!event.target.closest(".event-title-group")) {
    eventTitleHistoryList.classList.add("hidden");
  }
});

renderEventTitleHistory();

const eventDate =
  document.getElementById("eventDate");

const eventTime =
  document.getElementById("eventTime");

const eventEndDate =
  document.getElementById("eventEndDate");

const eventEndTime =
  document.getElementById("eventEndTime");

const eventGenre =
  document.getElementById("eventGenre");

const customGenreGroup =
  document.getElementById("customGenreGroup");

const customGenre =
  document.getElementById("customGenre");

const builtInGenres = ["学校", "課題", "部活", "バイト", "遊び", "その他"];

function setEventGenre(genre) {
  if (builtInGenres.includes(genre)) {
    eventGenre.value = genre;
    customGenre.value = "";
    customGenreGroup.classList.add("hidden");
  } else if (genre) {
    eventGenre.value = "その他";
    customGenre.value = genre;
    customGenreGroup.classList.remove("hidden");
  } else {
    eventGenre.value = "";
    customGenre.value = "";
    customGenreGroup.classList.add("hidden");
  }
}

function getEventGenreValue() {
  if (eventGenre.value === "その他") {
    return customGenre.value.trim() || "その他";
  }
  return eventGenre.value;
}

eventGenre.addEventListener("change", () => {
  const isOther = eventGenre.value === "その他";
  customGenreGroup.classList.toggle("hidden", !isOther);
  if (!isOther) customGenre.value = "";
});

const eventBandColorGroup =
  document.getElementById("eventBandColorGroup");

const eventBandColor =
  document.getElementById("eventBandColor");

const eventMemo =
  document.getElementById("eventMemo");

const cancelBtn =
  document.getElementById("cancelBtn");

const deleteBtn =
  document.getElementById("deleteBtn");


/* =========================
   新規予定
========================= */

function openEventModal(
  date,
  time
) {

  editingEventId = null;


  modalTitle.textContent =
    "予定を追加";
  setEventGenre("");
  eventBandColorGroup.classList.add("hidden");

  eventTitle.value = "";

  eventDate.value = date;

  eventTime.value = time;

  const defaultEnd = new Date(`${date}T${time}`);
  defaultEnd.setHours(defaultEnd.getHours() + 1);
  eventEndDate.value = getDateKey(defaultEnd);
  eventEndTime.value = `${pad(defaultEnd.getHours())}:${pad(defaultEnd.getMinutes())}`;

  eventMemo.value = "";


  deleteBtn.classList.add(
    "hidden"
  );


  modal.classList.remove(
    "hidden"
  );


  eventTitle.focus();
  renderEventTitleHistory();

}


/* =========================
   編集
========================= */

function openEditModal(id) {

  const event =
    events.find(
      event => event.id === id
    );


  if (!event) {
    return;
  }


  editingEventId =
    id;


  modalTitle.textContent =
    "予定を編集";


  eventTitle.value =
    event.title;

  eventDate.value =
    event.date;

  eventTime.value =
    event.time;

  const legacyEnd = new Date(`${event.date}T${event.time}`);
  legacyEnd.setHours(legacyEnd.getHours() + 1);
  eventEndDate.value =
    event.endDate || getDateKey(legacyEnd);
  eventEndTime.value =
    event.endTime || `${pad(legacyEnd.getHours())}:${pad(legacyEnd.getMinutes())}`;

  eventMemo.value =
    event.memo || "";

  setEventGenre(event.genre || "");

  eventBandColor.value =
    event.barColor || event.lineColor || "#2563ed";
  eventBandColorGroup.classList.remove("hidden");

  deleteBtn.classList.remove(
    "hidden"
  );


  modal.classList.remove(
    "hidden"
  );


  eventTitle.focus();
  renderEventTitleHistory();

}


/* =========================
   モーダルを閉じる
========================= */

function closeModal() {

  modal.classList.add(
    "hidden"
  );

  editingEventId = null;

}


/* =========================
   保存
========================= */

eventForm.addEventListener(
  "submit",
  function (e) {

    e.preventDefault();


    const title =
      eventTitle.value.trim();


    if (!title) {
      return;
    }

    if (`${eventEndDate.value}T${eventEndTime.value}` <= `${eventDate.value}T${eventTime.value}`) {
      alert("終了日時は開始日時より後にしてください。");
      return;
    }

    rememberEventTitle(title);

    const eventData = {

      title: title,

      date: eventDate.value,

      time: eventTime.value,

      endDate: eventEndDate.value,

      endTime: eventEndTime.value,

      genre: getEventGenreValue(),

      lineColor: editingEventId
        ? events.find(event => event.id === editingEventId)?.lineColor || "#2563ed"
        : getRandomLineColor(),

      barColor: editingEventId ? eventBandColor.value : undefined,

      memo: eventMemo.value.trim()

    };

    const duplicateCount = events.filter(event =>
      event.id !== editingEventId &&
      (event.title || "").trim() === eventData.title &&
      event.date === eventData.date &&
      event.time === eventData.time &&
      getEventEndDate(event) === eventData.endDate &&
      getEventEndTime(event) === eventData.endTime &&
      (event.genre || "") === eventData.genre &&
      (event.memo || "").trim() === eventData.memo
    ).length;

    if (duplicateCount > 0) {
      alert(`すでに同じ予定が${duplicateCount}件あります。予定はこのまま保存されます。`);
    }

    rememberEventTemplate(eventData);


    /*
      編集
    */

    if (editingEventId) {

      const event =
        events.find(
          event =>
            event.id === editingEventId
        );


      if (event) {

        event.title =
          eventData.title;

        event.date =
          eventData.date;

        event.time =
          eventData.time;

        event.endDate =
          eventData.endDate;

        event.endTime =
          eventData.endTime;

        event.memo =
          eventData.memo;

        event.genre =
          eventData.genre;

        event.barColor =
          eventData.barColor;
          
      }

    }

    /*
      新規
    */

    else {

      events.push({

        id:
          Date.now().toString(),

        ...eventData

      });

    }

    persistEvents();

    closeModal();

    render();

  }
);


/* =========================
   削除
========================= */

deleteBtn.addEventListener(
  "click",
  function () {

    if (!editingEventId) {
      return;
    }


    const index =
      events.findIndex(
        event =>
          event.id === editingEventId
      );


    if (index !== -1) {

      events.splice(
        index,
        1
      );

      persistEvents();

      if (selectedConnectorEventId === editingEventId) {
        selectedConnectorEventId = null;
        connectorColorInput.disabled = true;
        selectedLineLabel.textContent = "線をクリックして選択";
      }

    }


    closeModal();

    render();

  }
);


/* =========================
   キャンセル
========================= */

cancelBtn.addEventListener(
  "click",
  closeModal
);


/*
  モーダル外をクリック
*/

modal.addEventListener(
  "click",
  function (e) {

    if (e.target === modal) {

      closeModal();

    }

  }
);


/* =========================
   表示切り替え
========================= */

viewButtons.forEach(button => {

  button.addEventListener(
    "click",
    function () {

      currentView =
        button.dataset.view;


      render();

    }
  );

});


/* =========================
   前へ
========================= */

prevBtn.addEventListener(
  "click",
  function () {

    if (currentView === "month") {

      currentDate.setMonth(
        currentDate.getMonth() - 1
      );

    }

    else if (currentView === "week") {

      currentDate.setDate(
        currentDate.getDate() - 7
      );

    }

    else {

      currentDate.setDate(
        currentDate.getDate() - 1
      );

    }


    render();

  }
);


/* =========================
   次へ
========================= */

nextBtn.addEventListener(
  "click",
  function () {

    if (currentView === "month") {

      currentDate.setMonth(
        currentDate.getMonth() + 1
      );

    }

    else if (currentView === "week") {

      currentDate.setDate(
        currentDate.getDate() + 7
      );

    }

    else {

      currentDate.setDate(
        currentDate.getDate() + 1
      );

    }


    render();

  }
);


/* =========================
   今日
========================= */

todayBtn.addEventListener(
  "click",
  function () {

    currentDate =
      new Date();

    render();

  }
);


/* =========================
   表示
========================= */

function render() {

  monthView.classList.toggle(
    "hidden",
    currentView !== "month"
  );

  weekView.classList.toggle(
    "hidden",
    currentView !== "week"
  );

  dayView.classList.toggle(
    "hidden",
    currentView !== "day"
  );


  viewButtons.forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.view === currentView
    );

  });


  if (currentView === "month") {

    renderMonth();

  }

  else if (currentView === "week") {

    renderWeek();

  }

  else {

    renderDay();

  }

}


function getRandomLineColor(){
  const colors = [
    "#e53935",
    "#8e24aa",
    "#1e88e5",
    "#00897b",
    "#f9a825",
    "#43a047"
  ];

  const usedColors = new Set(
    events.map(event => (event.lineColor || "#2563ed").toLowerCase()
    ));

  const availableColors = colors.filter(
    color => !usedColors.has(color.toLowerCase())
  );

  if (availableColors.length > 0) {
    const index = Math.floor(Math.random() * availableColors.length);
    return availableColors[index];
  }
  
  let color;
  do{
    color =`#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")}`;
    } while (usedColors.has(color.toLowerCase()));

    return color;
}


/* =========================
   初期表示
========================= */

render();

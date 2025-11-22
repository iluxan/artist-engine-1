// ==================== STATE & ROUTING ====================
let currentView = 'events';
let currentPersonId = null;
let editingPersonId = null;
let editingEventId = null;
let peopleCache = [];

function showView(viewName) {
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.add('hidden');
  });

  const viewMap = {
    'events': 'eventsView',
    'eventForm': 'eventFormView',
    'people': 'peopleView',
    'personDetail': 'personDetailView',
    'personForm': 'personFormView'
  };

  const viewId = viewMap[viewName];
  if (viewId) {
    document.getElementById(viewId).classList.remove('hidden');
    currentView = viewName;
  }

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === viewName) {
      link.classList.add('active');
    }
  });
}

// ==================== NAVIGATION ====================
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = e.target.dataset.page;
    if (page === 'events') {
      showView('events');
      loadEvents();
    } else if (page === 'people') {
      showView('people');
      loadPeople();
    }
  });
});

document.getElementById('backToPeople').addEventListener('click', () => {
  showView('people');
  loadPeople();
});

document.getElementById('backFromForm').addEventListener('click', () => {
  showView('people');
  loadPeople();
});

document.getElementById('cancelFormBtn').addEventListener('click', () => {
  showView('people');
  loadPeople();
});

document.getElementById('backFromEventForm').addEventListener('click', () => {
  showView('events');
  loadEvents();
});

document.getElementById('cancelEventFormBtn').addEventListener('click', () => {
  showView('events');
  loadEvents();
});

// ==================== EVENTS VIEW ====================
async function loadEvents() {
  const eventsList = document.getElementById('eventsList');
  const emptyState = document.getElementById('eventsEmptyState');

  eventsList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading events...</p></div>';
  emptyState.classList.add('hidden');

  try {
    const personFilter = document.getElementById('personFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let url = '/api/events?';
    if (personFilter) url += `person_id=${personFilter}&`;
    if (statusFilter && statusFilter !== 'all') {
      url += `status=${statusFilter}`;
    } else if (statusFilter === 'all') {
      url += 'include_all=true';
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.events.length === 0) {
      eventsList.innerHTML = '';
      emptyState.classList.remove('hidden');

      // Wire up empty state button
      setTimeout(() => {
        const goButton = document.getElementById('goToPeopleFromEvents');
        if (goButton) {
          goButton.addEventListener('click', () => {
            showView('people');
            loadPeople();
          });
        }
      }, 0);

      return;
    }

    eventsList.innerHTML = '';
    data.events.forEach(event => {
      const card = createEventCard(event);
      eventsList.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading events:', error);
    eventsList.innerHTML = '<p class="error">Failed to load events</p>';
  }
}

function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';

  const header = document.createElement('div');
  header.className = 'event-card-header';

  const leftSection = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'event-card-title';
  title.textContent = event.title;

  const person = document.createElement('div');
  person.className = 'event-card-person';
  person.textContent = event.person_name;

  leftSection.appendChild(title);
  leftSection.appendChild(person);

  const rightSection = document.createElement('div');
  if (event.event_date) {
    const dateDiv = document.createElement('div');
    dateDiv.className = 'event-card-date';
    dateDiv.textContent = formatEventDate(event.event_date);
    rightSection.appendChild(dateDiv);
  }

  const statusBadge = document.createElement('span');
  statusBadge.className = `status-badge ${event.status}`;
  statusBadge.textContent = event.status;
  rightSection.appendChild(statusBadge);

  header.appendChild(leftSection);
  header.appendChild(rightSection);

  const body = document.createElement('div');
  body.className = 'event-card-body';

  if (event.description) {
    const description = document.createElement('div');
    description.className = 'event-card-description';
    description.textContent = event.description;
    body.appendChild(description);
  }

  const meta = document.createElement('div');
  meta.className = 'event-card-meta';

  if (event.venue || event.city) {
    const locationDiv = document.createElement('div');
    locationDiv.className = 'event-card-meta-item';
    const parts = [];
    if (event.venue) parts.push(event.venue);
    if (event.city) parts.push(event.city);
    if (event.country) parts.push(event.country);
    locationDiv.innerHTML = `📍 ${parts.join(', ')}`;
    meta.appendChild(locationDiv);
  }

  if (event.source_url) {
    const sourceDiv = document.createElement('div');
    sourceDiv.className = 'event-card-meta-item';
    sourceDiv.innerHTML = `🔗 <a href="${event.source_url}" target="_blank">Source</a>`;
    meta.appendChild(sourceDiv);
  }

  body.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'event-card-actions';

  if (event.url) {
    const eventLink = document.createElement('a');
    eventLink.href = event.url;
    eventLink.target = '_blank';
    eventLink.className = 'btn-primary';
    eventLink.textContent = 'View Event';
    actions.appendChild(eventLink);
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-text';
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => editEvent(event);
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-text';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = () => deleteEvent(event.id, event.title);
  actions.appendChild(deleteBtn);

  body.appendChild(actions);

  card.appendChild(header);
  card.appendChild(body);

  return card;
}

// Event filters
document.getElementById('personFilter').addEventListener('change', loadEvents);
document.getElementById('statusFilter').addEventListener('change', loadEvents);

// Add event button
// Extract All Events button
document.getElementById('extractAllEventsBtn').addEventListener('click', () => {
  extractAllEvents();
});

document.getElementById('addEventBtn').addEventListener('click', async () => {
  editingEventId = null;
  document.getElementById('eventFormTitle').textContent = 'Add New Event';

  // Load people for dropdown
  await loadPeopleForDropdown();

  // Reset form
  document.getElementById('eventForm').reset();
  document.getElementById('eventStatus').value = 'upcoming';

  showView('eventForm');
});

async function loadPeopleForDropdown() {
  try {
    const response = await fetch('/api/people');
    const data = await response.json();
    peopleCache = data.people;

    // Populate person filter
    const personFilter = document.getElementById('personFilter');
    personFilter.innerHTML = '<option value="">All People</option>';
    data.people.forEach(person => {
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = person.name;
      personFilter.appendChild(option);
    });

    // Populate event form person dropdown
    const eventPerson = document.getElementById('eventPerson');
    eventPerson.innerHTML = '<option value="">Select a person...</option>';
    data.people.forEach(person => {
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = person.name;
      eventPerson.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading people:', error);
  }
}

// Event form submission
document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    person_id: parseInt(document.getElementById('eventPerson').value),
    title: document.getElementById('eventTitle').value.trim(),
    description: document.getElementById('eventDescription').value.trim() || null,
    event_date: document.getElementById('eventDate').value || null,
    event_end_date: document.getElementById('eventEndDate').value || null,
    venue: document.getElementById('eventVenue').value.trim() || null,
    city: document.getElementById('eventCity').value.trim() || null,
    country: document.getElementById('eventCountry').value.trim() || null,
    location: document.getElementById('eventLocation').value.trim() || null,
    url: document.getElementById('eventUrl').value.trim() || null,
    status: document.getElementById('eventStatus').value
  };

  if (!formData.person_id || !formData.title) {
    alert('Person and title are required');
    return;
  }

  try {
    const method = editingEventId ? 'PUT' : 'POST';
    const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Failed to save event');

    showView('events');
    loadEvents();
  } catch (error) {
    console.error('Error saving event:', error);
    alert('Failed to save event');
  }
});

function editEvent(event) {
  editingEventId = event.id;
  document.getElementById('eventFormTitle').textContent = 'Edit Event';

  loadPeopleForDropdown().then(() => {
    document.getElementById('eventPerson').value = event.person_id;
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description || '';

    if (event.event_date) {
      document.getElementById('eventDate').value = formatDateTimeForInput(event.event_date);
    }
    if (event.event_end_date) {
      document.getElementById('eventEndDate').value = formatDateTimeForInput(event.event_end_date);
    }

    document.getElementById('eventVenue').value = event.venue || '';
    document.getElementById('eventCity').value = event.city || '';
    document.getElementById('eventCountry').value = event.country || '';
    document.getElementById('eventLocation').value = event.location || '';
    document.getElementById('eventUrl').value = event.url || '';
    document.getElementById('eventStatus').value = event.status;

    showView('eventForm');
  });
}

async function deleteEvent(id, title) {
  const confirmed = await showConfirmDialog(
    'Delete Event',
    `Are you sure you want to delete "${title}"?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete event');

    loadEvents();
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event');
  }
}

// ==================== PEOPLE VIEW ====================
async function loadPeople() {
  const peopleList = document.getElementById('peopleList');
  const emptyState = document.getElementById('emptyState');

  peopleList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading people...</p></div>';
  emptyState.classList.add('hidden');

  try {
    const response = await fetch('/api/people');
    const data = await response.json();

    if (data.people.length === 0) {
      peopleList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    peopleList.innerHTML = '';
    data.people.forEach(person => {
      const card = createPersonCard(person);
      peopleList.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading people:', error);
    peopleList.innerHTML = '<p class="error">Failed to load people</p>';
  }
}

function createPersonCard(person) {
  const card = document.createElement('div');
  card.className = 'person-card';

  const header = document.createElement('div');
  header.className = 'person-card-header';

  const name = document.createElement('h3');
  name.textContent = person.name;
  name.style.cursor = 'pointer';
  name.onclick = () => viewPerson(person.id);

  header.appendChild(name);

  const info = document.createElement('div');
  info.className = 'person-card-info';

  if (person.notes) {
    const notes = document.createElement('p');
    notes.className = 'person-notes';
    notes.textContent = person.notes;
    info.appendChild(notes);
  }

  const meta = document.createElement('div');
  meta.className = 'person-meta';
  meta.innerHTML = `
    <span>${person.source_count || 0} sources</span>
    <span>Added ${formatDate(person.created_at)}</span>
  `;
  info.appendChild(meta);

  card.appendChild(header);
  card.appendChild(info);

  return card;
}

document.getElementById('addPersonBtn').addEventListener('click', () => {
  editingPersonId = null;
  document.getElementById('formTitle').textContent = 'Add New Person';
  document.getElementById('personName').value = '';
  document.getElementById('personNotes').value = '';
  showView('personForm');
});

// ==================== PERSON FORM ====================
document.getElementById('personForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('personName').value.trim();
  const notes = document.getElementById('personNotes').value.trim();

  if (!name) {
    alert('Name is required');
    return;
  }

  try {
    const method = editingPersonId ? 'PUT' : 'POST';
    const url = editingPersonId ? `/api/people/${editingPersonId}` : '/api/people';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notes })
    });

    if (!response.ok) throw new Error('Failed to save person');

    showView('people');
    loadPeople();
  } catch (error) {
    console.error('Error saving person:', error);
    alert('Failed to save person');
  }
});

// ==================== PERSON DETAIL VIEW ====================
async function viewPerson(id) {
  currentPersonId = id;
  showView('personDetail');

  const detailDiv = document.getElementById('personDetail');
  detailDiv.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';

  try {
    const response = await fetch(`/api/people/${id}`);
    if (!response.ok) throw new Error('Failed to load person');

    const person = await response.json();
    displayPersonDetail(person);
  } catch (error) {
    console.error('Error loading person:', error);
    detailDiv.innerHTML = '<p class="error">Failed to load person details</p>';
  }
}

function displayPersonDetail(person) {
  const detailDiv = document.getElementById('personDetail');

  const html = `
    <div class="person-detail-header">
      <div>
        <h2>${person.name}</h2>
        ${person.notes ? `<p class="person-notes">${person.notes}</p>` : ''}
      </div>
      <div class="person-detail-actions">
        <button id="editPersonBtn" class="btn-secondary">Edit</button>
        <button id="discoverPersonBtn" class="btn-primary">Discover Sources</button>
      </div>
    </div>

    <div class="sources-section">
      <div class="section-header">
        <h3>Sources (${person.sources.length})</h3>
        <div style="display: flex; gap: 10px;">
          <button id="extractEventsBtn" class="btn-primary">🎭 Extract Events</button>
          <button id="analyzeFrequencyBtn" class="btn-secondary">📊 Analyze Frequency</button>
          <button id="addSourceBtn" class="btn-secondary">+ Add Source</button>
        </div>
      </div>
      <div id="sourcesList">
        ${person.sources.length === 0
          ? '<p class="empty-message">No sources found. Click "Discover Sources" to find them.</p>'
          : renderSources(person.sources)
        }
      </div>
    </div>

    <!-- Add Source Form (hidden by default) -->
    <div id="addSourceForm" class="hidden" style="margin-top: 20px;">
      <div class="form-container">
        <h4>Add New Source</h4>
        <form id="newSourceForm">
          <div class="form-group">
            <label for="sourceType">Type *</label>
            <select id="sourceType" required>
              <option value="website">Website</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="mastodon">Mastodon</option>
              <option value="facebook">Facebook</option>
              <option value="publisher">Publisher</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="sourceUrl">URL *</label>
            <input type="url" id="sourceUrl" required placeholder="https://example.com">
          </div>
          <div class="form-actions">
            <button type="button" id="cancelSourceBtn" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Add Source</button>
          </div>
        </form>
      </div>
    </div>
  `;

  detailDiv.innerHTML = html;

  document.getElementById('editPersonBtn').addEventListener('click', () => {
    editPerson(person.id, person.name, person.notes);
  });

  document.getElementById('discoverPersonBtn').addEventListener('click', () => {
    discoverForPerson(person.id);
  });

  // Extract Events button
  document.getElementById('extractEventsBtn').addEventListener('click', () => {
    extractEventsForPerson(person.id);
  });

  // Analyze Frequency button
  document.getElementById('analyzeFrequencyBtn').addEventListener('click', () => {
    analyzePostingFrequency(person.id);
  });

  // Add Source button
  document.getElementById('addSourceBtn').addEventListener('click', () => {
    const form = document.getElementById('addSourceForm');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
      document.getElementById('sourceUrl').focus();
    }
  });

  // Cancel add source
  document.getElementById('cancelSourceBtn').addEventListener('click', () => {
    document.getElementById('addSourceForm').classList.add('hidden');
    document.getElementById('newSourceForm').reset();
  });

  // Submit new source
  document.getElementById('newSourceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('sourceType').value;
    const url = document.getElementById('sourceUrl').value;

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: person.id,
          type,
          url
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add source');
      }

      // Success - reload person detail
      document.getElementById('addSourceForm').classList.add('hidden');
      document.getElementById('newSourceForm').reset();
      viewPerson(person.id);

    } catch (error) {
      console.error('Error adding source:', error);
      alert('Failed to add source: ' + error.message);
    }
  });
}

function renderSources(sources) {
  const grouped = {};
  sources.forEach(source => {
    if (!grouped[source.type]) {
      grouped[source.type] = [];
    }
    grouped[source.type].push(source);
  });

  let html = '';
  for (const type in grouped) {
    html += `
      <div class="source-group">
        <h4>${type}</h4>
        <div class="source-list">
          ${grouped[type].map(source => `
            <div class="source-item" data-source-id="${source.id}">
              <div class="source-info-container">
                <div style="flex: 1;">
                  <a href="${source.url}" target="_blank" class="source-link">${source.url}</a>
                  ${source.last_post_date || source.avg_posts_per_month ? `
                    <div class="source-meta" style="font-size: 0.85rem; color: #666; margin-top: 4px;">
                      ${source.last_post_date ? `🕐 <strong>${formatTimeSince(source.last_post_date)}</strong> since last post` : ''}
                      ${source.last_post_date && source.avg_posts_per_month ? ' • ' : ''}
                      ${source.avg_posts_per_month ? `📊 <strong>${source.avg_posts_per_month.toFixed(1)}</strong> posts/mo` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
              <div class="source-actions">
                <button class="btn-text edit-source"
                        data-source-id="${source.id}"
                        data-source-type="${source.type}"
                        data-source-url="${source.url}"
                        data-last-post="${source.last_post_date || ''}"
                        data-avg-posts="${source.avg_posts_per_month || ''}">Edit</button>
                <button class="btn-icon delete-source" data-source-id="${source.id}">×</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setTimeout(() => {
    attachSourceEventListeners();
  }, 0);

  return html;
}

function editPerson(id, name, notes) {
  editingPersonId = id;
  document.getElementById('formTitle').textContent = 'Edit Person';
  document.getElementById('personName').value = name;
  document.getElementById('personNotes').value = notes || '';
  showView('personForm');
}

async function deletePerson(id, name) {
  const confirmed = await showConfirmDialog(
    'Delete Person',
    `Are you sure you want to delete "${name}" and all their sources?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/people/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete person');

    loadPeople();
  } catch (error) {
    console.error('Error deleting person:', error);
    alert('Failed to delete person');
  }
}

async function aiDiscoverForPerson(id) {
  try {
    // Show loading message
    const loadingMsg = alert('🤖 AI Discovery in progress... This may take 30-60 seconds.');

    const response = await fetch(`/api/people/${id}/discover-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to discover sources');
    }

    const data = await response.json();
    alert(`✅ AI Discovery complete!\nFound ${data.total_sources} verified sources.`);

    if (currentView === 'personDetail' && currentPersonId === id) {
      viewPerson(id);
    } else {
      loadPeople();
    }
  } catch (error) {
    console.error('Error discovering sources with AI:', error);
    alert('❌ Failed to discover sources with AI:\n' + error.message);
  }
}

async function discoverForPerson(id) {
  try {
    const response = await fetch(`/api/people/${id}/discover`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to discover sources');

    const data = await response.json();
    alert(`Found ${data.total_sources} sources!`);

    if (currentView === 'personDetail' && currentPersonId === id) {
      viewPerson(id);
    } else {
      loadPeople();
    }
  } catch (error) {
    console.error('Error discovering sources:', error);
    alert('Failed to discover sources');
  }
}

async function editSource(sourceId, currentType, currentUrl, currentLastPost = '', currentAvgPosts = '') {
  // Create inline edit form
  const sourceItem = document.querySelector(`.source-item[data-source-id="${sourceId}"]`);
  if (!sourceItem) return;

  const originalHTML = sourceItem.innerHTML;

  sourceItem.innerHTML = `
    <form class="edit-source-form" style="flex: 1; display: flex; gap: 10px; align-items: center;">
      <select class="edit-source-type" style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 6px; min-width: 120px;">
        <option value="website" ${currentType === 'website' ? 'selected' : ''}>Website</option>
        <option value="twitter" ${currentType === 'twitter' ? 'selected' : ''}>Twitter</option>
        <option value="instagram" ${currentType === 'instagram' ? 'selected' : ''}>Instagram</option>
        <option value="mastodon" ${currentType === 'mastodon' ? 'selected' : ''}>Mastodon</option>
        <option value="facebook" ${currentType === 'facebook' ? 'selected' : ''}>Facebook</option>
        <option value="publisher" ${currentType === 'publisher' ? 'selected' : ''}>Publisher</option>
        <option value="other" ${currentType === 'other' ? 'selected' : ''}>Other</option>
      </select>
      <input type="url" class="edit-source-url" value="${currentUrl}" required
             style="flex: 1; padding: 8px; border: 2px solid #667eea; border-radius: 6px;">
      <input type="date" class="edit-last-post" value="${currentLastPost}" placeholder="Last post"
             style="padding: 8px; border: 2px solid #e0e0e0; border-radius: 6px; width: 140px;">
      <input type="number" class="edit-avg-posts" value="${currentAvgPosts}" step="0.1" min="0"
             placeholder="Posts/mo"
             style="width: 100px; padding: 8px; border: 2px solid #e0e0e0; border-radius: 6px;">
      <button type="submit" class="btn-primary" style="padding: 8px 16px; width: auto;">Save</button>
      <button type="button" class="btn-secondary cancel-edit" style="padding: 8px 16px; width: auto;">Cancel</button>
    </form>
  `;

  const form = sourceItem.querySelector('.edit-source-form');
  const cancelBtn = sourceItem.querySelector('.cancel-edit');

  cancelBtn.addEventListener('click', () => {
    sourceItem.innerHTML = originalHTML;
    attachSourceEventListeners();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newType = sourceItem.querySelector('.edit-source-type').value;
    const newUrl = sourceItem.querySelector('.edit-source-url').value;
    const newLastPost = sourceItem.querySelector('.edit-last-post').value;
    const newAvgPosts = sourceItem.querySelector('.edit-avg-posts').value;

    try {
      const updateData = {
        type: newType,
        url: newUrl
      };

      // Only include frequency data if provided
      if (newLastPost) {
        updateData.last_post_date = newLastPost;
      }
      if (newAvgPosts) {
        updateData.avg_posts_per_month = parseFloat(newAvgPosts);
      }

      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update source');
      }

      // Reload person detail
      viewPerson(currentPersonId);

    } catch (error) {
      console.error('Error updating source:', error);
      alert('Failed to update source: ' + error.message);
      sourceItem.innerHTML = originalHTML;
      attachSourceEventListeners();
    }
  });
}

function attachSourceEventListeners() {
  document.querySelectorAll('.delete-source').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sourceId = e.target.dataset.sourceId;
      deleteSource(sourceId);
    });
  });

  document.querySelectorAll('.edit-source').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sourceId = e.target.dataset.sourceId;
      const sourceType = e.target.dataset.sourceType;
      const sourceUrl = e.target.dataset.sourceUrl;
      const lastPost = e.target.dataset.lastPost;
      const avgPosts = e.target.dataset.avgPosts;
      editSource(sourceId, sourceType, sourceUrl, lastPost, avgPosts);
    });
  });
}

async function deleteSource(sourceId) {
  const confirmed = await showConfirmDialog(
    'Delete Source',
    'Are you sure you want to delete this source?'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete source');

    viewPerson(currentPersonId);
  } catch (error) {
    console.error('Error deleting source:', error);
    alert('Failed to delete source');
  }
}


// ==================== POSTING FREQUENCY ANALYSIS ====================
async function analyzePostingFrequency(personId) {
  if (!confirm('This will analyze all sources for posting frequency using AI. It may take 1-2 minutes and cost ~$0.10-0.20. Continue?')) {
    return;
  }

  const detailDiv = document.getElementById('personDetail');
  const originalContent = detailDiv.innerHTML;

  try {
    // Show loading state
    detailDiv.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>📊 Analyzing posting frequency for all sources...</p>
        <p style="color: #666; font-size: 0.9rem;">This may take 1-2 minutes depending on number of sources</p>
      </div>
    `;

    const response = await fetch(`/api/people/${personId}/analyze-frequency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze frequency');
    }

    const data = await response.json();

    // Show results
    displayAnalysisResults(data, personId);

  } catch (error) {
    console.error('Error analyzing frequency:', error);
    detailDiv.innerHTML = originalContent;
    alert('Failed to analyze posting frequency: ' + error.message);
  }
}

function displayAnalysisResults(data, personId) {
  const detailDiv = document.getElementById('personDetail');

  let resultsHtml = `
    <div class="back-nav">
      <button id="backToDetail" class="btn-secondary">← Back to Details</button>
    </div>

    <h2>📊 Posting Frequency Analysis Results</h2>
    <p style="margin-bottom: 30px; color: #666;">
      Analyzed ${data.sources_analyzed} source${data.sources_analyzed !== 1 ? 's' : ''}
    </p>

    <div class="results-section">
  `;

  data.results.forEach(result => {
    const timeSince = result.last_post_date ? formatTimeSince(result.last_post_date) : 'Unknown';
    const postsPerMonth = result.avg_posts_per_month ? result.avg_posts_per_month.toFixed(1) : '0';

    resultsHtml += `
      <div class="person-result" style="margin-bottom: 20px;">
        <h3 style="font-size: 1rem; margin-bottom: 10px;">
          <a href="${result.url}" target="_blank">${result.url}</a>
        </h3>
        <div style="display: grid; gap: 10px;">
          <div style="display: flex; gap: 20px;">
            <div>
              <strong>Last Post:</strong>
              ${result.last_post_date ? `${timeSince} ago (${new Date(result.last_post_date).toLocaleDateString()})` : 'Unknown'}
            </div>
            <div>
              <strong>Avg Posts/Month:</strong> ${postsPerMonth}
            </div>
          </div>
          <div style="color: #666; font-size: 0.9rem; font-style: italic;">
            ${result.analysis}
          </div>
        </div>
      </div>
    `;
  });

  resultsHtml += `
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <button id="viewUpdatedPerson" class="btn-primary">View Updated Source List</button>
    </div>
  `;

  detailDiv.innerHTML = resultsHtml;

  document.getElementById('backToDetail').addEventListener('click', () => {
    viewPerson(personId);
  });

  document.getElementById('viewUpdatedPerson').addEventListener('click', () => {
    viewPerson(personId);
  });
}

async function extractEventsForPerson(personId) {
  if (!confirm('This will extract and verify events from all sources using AI. It may take 2-5 minutes and cost ~$2-5. Continue?')) {
    return;
  }

  const detailDiv = document.getElementById('personDetail');
  const originalContent = detailDiv.innerHTML;

  try {
    // Show loading state
    detailDiv.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>🎭 Extracting events from all sources...</p>
        <p style="color: #666; font-size: 0.9rem;">This may take 2-5 minutes depending on number of sources</p>
        <p style="color: #999; font-size: 0.85rem; margin-top: 10px;">
          ✓ Extracting events with AI<br>
          ✓ Verifying URLs (HTTP check)<br>
          ✓ Validating content (AI match)<br>
          ✓ Checking dates and registration links
        </p>
      </div>
    `;

    const response = await fetch(`/api/people/${personId}/extract-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract events');
    }

    const data = await response.json();

    // Show success message
    detailDiv.innerHTML = `
      <div class="success-message" style="text-align: center; padding: 40px;">
        <div style="font-size: 3rem; margin-bottom: 20px;">✅</div>
        <h2>Event Extraction Complete!</h2>
        <div style="margin: 30px 0; font-size: 1.1rem;">
          <p><strong>${data.events_saved}</strong> events saved to review queue</p>
          <p style="color: #666; margin-top: 10px;">
            Processed ${data.sources_processed} of ${data.total_sources} sources<br>
            Found ${data.events_extracted} event candidates
          </p>
        </div>
        <div style="margin-top: 40px; display: flex; gap: 15px; justify-content: center;">
          <button id="backToPersonBtn" class="btn-secondary">← Back to Person</button>
          <button id="reviewEventsBtn" class="btn-primary">Review Events →</button>
        </div>
      </div>
    `;

    // Add event listeners to buttons
    document.getElementById('backToPersonBtn').addEventListener('click', () => {
      viewPerson(personId);
    });

    document.getElementById('reviewEventsBtn').addEventListener('click', () => {
      showView('reviewEvents');
      loadUnverifiedEvents();
    });

  } catch (error) {
    console.error('Error extracting events:', error);
    detailDiv.innerHTML = originalContent;
    alert('Failed to extract events: ' + error.message);
  }
}

async function extractAllEvents() {
  // First, get all people
  const response = await fetch('/api/people');
  const data = await response.json();
  const people = data.people;

  if (people.length === 0) {
    alert('No people found. Add some people first!');
    return;
  }

  const totalSources = people.reduce((sum, p) => sum + (p.source_count || 0), 0);
  const estimatedMinutes = Math.ceil(totalSources * 0.5); // ~30 seconds per source
  const estimatedCost = totalSources * 1; // ~$1 per source

  if (!confirm(`This will extract events for ${people.length} people (${totalSources} total sources).\n\nEstimated time: ${estimatedMinutes}-${estimatedMinutes * 2} minutes\nEstimated cost: $${estimatedCost}-${estimatedCost * 2}\n\nContinue?`)) {
    return;
  }

  // Show loading overlay on the events page
  const eventsList = document.getElementById('eventsList');
  const originalContent = eventsList.innerHTML;

  try {
    eventsList.innerHTML = `
      <div class="loading" style="padding: 60px 20px;">
        <div class="spinner"></div>
        <h3 style="margin: 20px 0;">🎭 Extracting Events for All People</h3>
        <p style="color: #666; margin-bottom: 20px;">This may take ${estimatedMinutes}-${estimatedMinutes * 2} minutes</p>
        <div id="extractionProgress" style="color: #999; font-size: 0.9rem;">
          <p>Processing person <span id="currentPersonNum">1</span> of ${people.length}...</p>
          <p id="currentPersonName" style="margin-top: 10px; font-weight: 600;"></p>
          <p id="extractionStats" style="margin-top: 20px; color: #666;"></p>
        </div>
      </div>
    `;

    let totalExtracted = 0;
    let totalSaved = 0;

    // Process each person sequentially
    for (let i = 0; i < people.length; i++) {
      const person = people[i];

      // Update progress
      document.getElementById('currentPersonNum').textContent = i + 1;
      document.getElementById('currentPersonName').textContent = person.name;

      try {
        const response = await fetch(`/api/people/${person.id}/extract-events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const result = await response.json();
          totalExtracted += result.events_extracted || 0;
          totalSaved += result.events_saved || 0;

          document.getElementById('extractionStats').innerHTML = `
            <strong>Progress:</strong><br>
            Events extracted: ${totalExtracted}<br>
            Events saved: ${totalSaved}
          `;
        }
      } catch (error) {
        console.error(`Error extracting for ${person.name}:`, error);
      }
    }

    // Show completion message
    eventsList.innerHTML = `
      <div class="success-message" style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">✅</div>
        <h2>Extraction Complete for All People!</h2>
        <div style="margin: 30px 0; font-size: 1.2rem;">
          <p><strong>${totalSaved}</strong> events saved to review queue</p>
          <p style="color: #666; margin-top: 15px;">
            Processed ${people.length} people<br>
            Found ${totalExtracted} event candidates
          </p>
        </div>
        <div style="margin-top: 40px;">
          <button id="reloadEventsBtn" class="btn-primary">Reload Events</button>
        </div>
      </div>
    `;

    // Wire up reload button
    setTimeout(() => {
      document.getElementById('reloadEventsBtn').addEventListener('click', () => {
        loadEvents();
      });
    }, 0);

  } catch (error) {
    console.error('Error extracting all events:', error);
    eventsList.innerHTML = originalContent;
    alert('Failed to extract events: ' + error.message);
  }
}

// ==================== HELPER FUNCTIONS ====================

// ==================== CONFIRMATION DIALOG ====================
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('confirmDialog');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const cancelBtn = document.getElementById('confirmCancel');
    const okBtn = document.getElementById('confirmOk');

    titleEl.textContent = title;
    messageEl.textContent = message;
    dialog.classList.remove('hidden');

    const cleanup = () => {
      dialog.classList.add('hidden');
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      okBtn.replaceWith(okBtn.cloneNode(true));
    };

    document.getElementById('confirmCancel').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    document.getElementById('confirmOk').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

// ==================== UTILITIES ====================
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

function formatTimeSince(dateString) {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo`;
  return `${(diffDays / 365).toFixed(1)} years`;
}

function formatEventDate(dateString) {
  if (!dateString) return 'Date TBD';

  const date = new Date(dateString);
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };

  return date.toLocaleDateString('en-US', options);
}

function formatDateTimeForInput(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ==================== INITIALIZATION ====================
showView('events');
loadEvents();
loadPeopleForDropdown();
// ==================== STATE & ROUTING ====================
let currentView = 'people';
let currentPersonId = null;
let editingPersonId = null;

function showView(viewName) {
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.add('hidden');
  });

  const viewMap = {
    'people': 'peopleView',
    'discover': 'discoverView',
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
    if (page === 'people') {
      showView('people');
      loadPeople();
    } else if (page === 'discover') {
      showView('discover');
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

  const actions = document.createElement('div');
  actions.className = 'person-card-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn-text';
  viewBtn.textContent = 'View';
  viewBtn.onclick = () => viewPerson(person.id);

  const discoverBtn = document.createElement('button');
  discoverBtn.className = 'btn-text';
  discoverBtn.textContent = 'Discover';
  discoverBtn.onclick = () => discoverForPerson(person.id);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-text danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = () => deletePerson(person.id, person.name);

  actions.appendChild(viewBtn);
  actions.appendChild(discoverBtn);
  actions.appendChild(deleteBtn);

  header.appendChild(name);
  header.appendChild(actions);

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
      <h3>Sources (${person.sources.length})</h3>
      <div id="sourcesList">
        ${person.sources.length === 0
          ? '<p class="empty-message">No sources found. Click "Discover Sources" to find them.</p>'
          : renderSources(person.sources)
        }
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
            <div class="source-item">
              <a href="${source.url}" target="_blank">${source.url}</a>
              <span class="confidence ${source.confidence}">${source.confidence}</span>
              <button class="btn-icon delete-source" data-source-id="${source.id}">×</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  setTimeout(() => {
    document.querySelectorAll('.delete-source').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sourceId = e.target.dataset.sourceId;
        deleteSource(sourceId);
      });
    });
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

// ==================== DISCOVERY VIEW (Phase 1) ====================
const discoverForm = document.getElementById('peopleForm');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const resultsDiv = document.getElementById('results');
const discoverBtn = document.getElementById('discoverBtn');

discoverForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const people = [
    document.getElementById('person1').value.trim(),
    document.getElementById('person2').value.trim(),
    document.getElementById('person3').value.trim(),
    document.getElementById('person4').value.trim()
  ].filter(name => name !== '');

  if (people.length < 2) {
    alert('Please enter at least 2 people');
    return;
  }

  const saveToDb = document.getElementById('saveToDb').checked;

  loading.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  discoverBtn.disabled = true;

  try {
    const response = await fetch('/api/discover-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ people, save_to_db: saveToDb })
    });

    if (!response.ok) throw new Error('Failed to discover sources');

    const data = await response.json();
    displayDiscoveryResults(data.results, saveToDb);

  } catch (error) {
    console.error('Error:', error);
    alert('Failed to discover sources. Please try again.');
  } finally {
    loading.classList.add('hidden');
    discoverBtn.disabled = false;
  }
});

function displayDiscoveryResults(results, saved) {
  resultsDiv.innerHTML = '';

  if (saved) {
    const savedMessage = document.createElement('div');
    savedMessage.className = 'success-message';
    savedMessage.innerHTML = `
      <p>✓ Saved to database! <a href="#" id="viewSavedLink">View saved people</a></p>
    `;
    resultsDiv.appendChild(savedMessage);

    setTimeout(() => {
      document.getElementById('viewSavedLink').addEventListener('click', (e) => {
        e.preventDefault();
        showView('people');
        loadPeople();
      });
    }, 0);
  }

  results.forEach(result => {
    const personDiv = document.createElement('div');
    personDiv.className = 'person-result';

    const personTitle = document.createElement('h3');
    personTitle.textContent = result.person;
    personDiv.appendChild(personTitle);

    if (result.sources.length === 0) {
      const noSources = document.createElement('p');
      noSources.className = 'no-sources';
      noSources.textContent = 'No sources found';
      personDiv.appendChild(noSources);
    } else {
      const sourcesList = document.createElement('div');
      sourcesList.className = 'sources-list';

      result.sources.forEach((source, index) => {
        const sourceItem = document.createElement('div');
        sourceItem.className = 'source-item';

        const sourceInfo = document.createElement('div');
        sourceInfo.className = 'source-info';

        const sourceType = document.createElement('span');
        sourceType.className = 'source-type';
        sourceType.textContent = source.type;

        const sourceUrl = document.createElement('div');
        sourceUrl.className = 'source-url';
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.textContent = source.url;
        sourceUrl.appendChild(link);

        sourceInfo.appendChild(sourceType);
        sourceInfo.appendChild(sourceUrl);

        const confidence = document.createElement('span');
        confidence.className = `confidence ${source.confidence}`;
        confidence.textContent = source.confidence;

        sourceItem.appendChild(sourceInfo);
        sourceItem.appendChild(confidence);

        sourcesList.appendChild(sourceItem);
      });

      personDiv.appendChild(sourcesList);
    }

    resultsDiv.appendChild(personDiv);
  });

  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

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

// ==================== INITIALIZATION ====================
showView('people');
loadPeople();
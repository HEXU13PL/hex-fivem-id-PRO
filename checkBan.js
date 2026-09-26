const VISITOR_ID_KEY = 'hex_user_id';
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const createVisitorId = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const suffix = Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
    return `USR-${suffix}`;
};

const getVisitorId = () => {
    const existingId = localStorage.getItem(VISITOR_ID_KEY);
    if (existingId) return existingId.trim().toUpperCase();

    const visitorId = createVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    return visitorId;
};

const makeElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
};

const copyToClipboard = async (value) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
    }

    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied;
};

const showAccessGate = (visitorId, isBanned) => {
    const root = document.documentElement;
    root.dataset.accessState = 'blocked';
    document.title = isBanned ? 'Dostęp zablokowany • HEX' : 'Dostęp wymagany • HEX';

    const renderGate = () => {
        const gate = makeElement('main', 'access-gate');
        const panel = makeElement('section', 'access-panel');
        const brand = makeElement('div', 'access-brand', 'HEX / ACCESS CONTROL');
        const eyebrow = makeElement('div', 'access-eyebrow', isBanned ? 'ACCESS DENIED' : 'INVITATION REQUIRED');
        const title = makeElement('h1', 'access-title', isBanned ? 'Dostęp zablokowany' : 'Ta strona jest prywatna');
        const description = makeElement(
            'p',
            'access-description',
            isBanned
                ? 'Ten identyfikator nie ma dostępu do panelu.'
                : 'Skopiuj swój identyfikator i przekaż go administratorowi, aby uzyskać dostęp.'
        );
        const idLabel = makeElement('span', 'access-id-label', 'ID SESJI');
        const idValue = makeElement('code', 'access-id-value', visitorId);
        const copyButton = makeElement('button', 'access-copy-button', 'Kopiuj ID sesji');
        const copyStatus = makeElement('p', 'access-copy-status', 'Dopisz ID w pliku allowedUsers.js i odśwież stronę.');

        copyButton.type = 'button';
        copyButton.addEventListener('click', async () => {
            try {
                const copied = await copyToClipboard(visitorId);
                copyStatus.textContent = copied ? 'Skopiowano ID sesji.' : `Skopiuj ręcznie: ${visitorId}`;
                copyButton.textContent = copied ? 'Skopiowano' : 'Kopiuj ID sesji';
            } catch {
                copyStatus.textContent = `Skopiuj ręcznie: ${visitorId}`;
            }
        });

        panel.append(brand, eyebrow, title, description, idLabel, idValue, copyButton, copyStatus);
        gate.appendChild(panel);
        document.body.classList.add('access-locked');
        document.body.replaceChildren(gate);
    };

    if (document.body) {
        renderGate();
    } else {
        document.addEventListener('DOMContentLoaded', renderGate, { once: true });
    }
};

try {
    const visitorId = getVisitorId();
    const bannedUsers = window.HEX_BANNED_USERS || new Set();
    const allowedUsers = window.HEX_ALLOWED_USERS || new Set();
    const isBanned = bannedUsers.has(visitorId);

    if (isBanned || !allowedUsers.has(visitorId)) {
        showAccessGate(visitorId, isBanned);
    } else {
        document.documentElement.dataset.accessState = 'granted';
    }
} catch (error) {
    console.error('Nie udało się sprawdzić dostępu:', error);
    showAccessGate('ID niedostępne', false);
}

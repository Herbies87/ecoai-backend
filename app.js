const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const ecoCheckbox = document.getElementById('ecoFriendlyCheckbox');

function appendMessage(text, sender = 'user') {
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'user'
    ? 'text-right mb-2'
    : 'text-left mb-2 text-gray-700';

  msgDiv.innerHTML = `<span class="inline-block px-4 py-2 rounded-lg ${
    sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200'
  }">${text}</span>`;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessageToAPI(userText) {
  try {
    const ecoFriendly = ecoCheckbox.checked;
    // Compose messages array for Chat Completion API
    const messages = [];

    if (ecoFriendly) {
      messages.push({
        role: 'system',
        content: 'Please prioritize eco-friendly, sustainability-aware responses.'
      });
    }

    messages.push({
      role: 'user',
      content: userText
    });

    const response = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.reply || 'Sorry, no response.';
  } catch (error) {
    console.error('Error fetching AI response:', error);
    return 'Oops, something went wrong. Please try again.';
  }
}

async function handleSendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, 'user');
  userInput.value = '';

  const reply = await sendMessageToAPI(text);
  appendMessage(reply, 'bot');
  userInput.focus();
}

sendBtn.addEventListener('click', handleSendMessage);
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
});

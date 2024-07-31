document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('start-conversation-button');
  const newConversationButton = document.getElementById('start-new-conversation-button');
  const recentConversationsContainer = document.getElementById('recent-conversations-container');
  const recentConversationsList = document.getElementById('recent-conversations-list');
  const noConversationsMessage = document.getElementById('no-conversations-message');
  const chatContainer = document.getElementById('chat-container');
  const chatMessages = document.getElementById('chat-messages');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const clearButton = document.getElementById('clear-conversation-button');
  const backButton = document.getElementById('back-to-recent-button');
  const API_KEY = 'YjhkYzE0ODVkYjRiNDU2ZDlkOGY1MTAzOTExMjIxNjk=';
  const PERSONA_ID = '4f7d1389-21b6-402a-b40f-0753dfd9d713';

  let conversationId = '';
  const maxConversations = 3;

  function addMessage(content, isUser) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isUser ? 'user-message' : 'bot-message');
    messageElement.textContent = content;
    chatMessages.appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });

    // Save the conversation to localStorage
    saveConversation();
  }

  function generateConversationTitle(messages) {
    // Use the first user message as the title
    const tempElement = document.createElement('div');
    tempElement.innerHTML = messages;
    const userMessages = Array.from(tempElement.getElementsByClassName('user-message'));
    return userMessages.length ? userMessages[0].textContent.slice(0, 50) : 'New Conversation';
  }

  function saveConversation() {
    const messages = chatMessages.innerHTML;
    const title = generateConversationTitle(messages);
    const conversation = {
      id: conversationId,
      title: title,
      messages: messages,
      lastMessage: messages.split('</div>').slice(-2, -1)[0], // Get the last message content
      date: new Date().toLocaleString()
    };

    let conversations = JSON.parse(localStorage.getItem('conversations')) || [];
    conversations = conversations.filter(conv => conv.id !== conversationId); // Remove duplicate if it exists
    conversations.unshift(conversation); // Add the new/updated conversation to the beginning

    if (conversations.length > maxConversations) {
      conversations.pop(); // Remove the oldest conversation if we exceed the maxConversations
    }

    localStorage.setItem('conversations', JSON.stringify(conversations));
    // Update the recent conversations list without showing the screen
    updateRecentConversationsList();
  }

  function loadConversation(conversation) {
    conversationId = conversation.id;
    chatMessages.innerHTML = conversation.messages;
    recentConversationsContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
  }

  function loadRecentConversations() {
    updateRecentConversationsList();
    document.getElementById('start-conversation-container').style.display = 'none';
    recentConversationsContainer.style.display = 'flex';
    chatContainer.style.display = 'none';
  }

  function updateRecentConversationsList() {
    const conversations = JSON.parse(localStorage.getItem('conversations')) || [];
    recentConversationsList.innerHTML = '';

    if (conversations.length === 0) {
      noConversationsMessage.style.display = 'block';
      recentConversationsList.innerHTML = ` <div id="noConvoMessage">No recent conversations</div> <img src="homeillus.svg" id="noConvoImage"/> `;  } 
       else {
      noConversationsMessage.style.display = 'none';
      conversations.forEach(conversation => {
        const conversationCard = document.createElement('div');
        conversationCard.classList.add('recent-conversation-card');
        conversationCard.innerHTML = `
          <div><strong>${conversation.title}</strong></div>
          <div>${conversation.lastMessage}</div>
          <div>${conversation.date}</div>
        `;
        conversationCard.addEventListener('click', () => loadConversation(conversation));
        recentConversationsList.appendChild(conversationCard);
      });
    }
  }

  async function clearConversation() {
    chatMessages.innerHTML = '';
    conversationId = '';
    localStorage.removeItem('conversations');

    // Start a new conversation after clearing
    await startConversation();
  }

  async function startConversation() {
    try {
      const response = await fetch('https://api-dev1.hyperleap.ai/conversations/persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hl-api-key': API_KEY
        },
        body: JSON.stringify({
          "personaId": PERSONA_ID,
          "replacements": {
            "person": "person value"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      conversationId = data.conversationId;
      recentConversationsContainer.style.display = 'none';
      chatContainer.style.display = 'flex';

      // Clear chat messages for the new conversation
      chatMessages.innerHTML = '';
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (message && conversationId) {
      addMessage(message, true);
      userInput.value = '';

      const loadingIndicator = document.createElement('div');
      loadingIndicator.classList.add('typing-indicator');
      loadingIndicator.innerHTML = `
        <div></div>
        <div></div>
        <div></div>
      `;
      chatMessages.appendChild(loadingIndicator);
      loadingIndicator.scrollIntoView({ behavior: 'smooth', block: 'end' });

      try {
        const options = {
          method: 'PATCH',
          headers: {
            accept: 'application/json',
            'x-hl-api-key': API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({ message })
        };

        const response = await fetch(`https://api-dev1.hyperleap.ai/conversations/${conversationId}/continue-sync`, options);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        chatMessages.removeChild(loadingIndicator);
        addMessage(`${data.choices[0].message.content || data.message || 'No valid response field found'}`, false);
      } catch (error) {
        chatMessages.removeChild(loadingIndicator);
        addMessage(`HyperBot: Sorry, an error occurred. ${error.message}`, false);
        console.error('Error continuing conversation:', error);
      }
    }
  }

  if (startButton) {
    startButton.addEventListener('click', loadRecentConversations);
  }

  if (newConversationButton) {
    newConversationButton.addEventListener('click', startConversation);
  }

  if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
  }

  if (clearButton) {
    clearButton.addEventListener('click', clearConversation);
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      chatContainer.style.display = 'none';
      loadRecentConversations();
    });
  }

  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  chrome.runtime.onInstalled.addListener(() => {
    console.log('HyperBot extension installed');
  });
});
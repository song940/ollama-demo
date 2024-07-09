import { ready } from 'https://lsong.org/scripts/dom.js';
import { parse } from 'https://lsong.org/scripts/marked.js';
import { registerServiceWorker } from 'https://lsong.org/scripts/sw.js';
import { h, render, useState, useEffect, useRef } from 'https://lsong.org/scripts/react/index.js';
import { Ollama } from './ollama.js';

const ollama = new Ollama({
  host: 'https://ollama.lsong.org',
});

const Message = ({ message }) => {
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.innerHTML = parse(message.content);
    }
  }, [message]);

  return h('div', { className: `preview message-role-${message.role}` },
    h('div', { ref: previewRef, className: 'message-content' })
  );
};

const App = () => {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('qwen2');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchModels = async () => {
      const modelsList = await ollama.list();
      setModels(modelsList);
      setModel(modelsList[0].model);
    };
    fetchModels();
  }, []);

  const sendMessage = async (promptText) => {
    const userMessage = {
      role: 'user',
      content: promptText,
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    const responseStream = ollama.chat({ model, messages: [...messages, userMessage] });
    setMessages(prevMessages => [...prevMessages, {
      role: 'assistant',
      content: '',
    }]);
    for await (const part of responseStream) {
      const { role, content } = part.message;
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        const lastMessage = updatedMessages[updatedMessages.length - 1];
        updatedMessages[updatedMessages.length - 1] = {
          role,
          content: lastMessage.content + content,
        };
        return updatedMessages;
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendMessage(prompt);
    setPrompt('');
  };

  return h('div', null, [
    h('h2', null, 'Ollama'),
    h('div', { className: 'flex flex-center' }, [
      h('label', null, 'Model:'),
      h('select', { className: 'select', onChange: e => setModel(e.target.value), value: model },
        models.map(({ model, name }) => h('option', { value: model }, name))
      ),
    ]),
    h('ul', { className: 'messages' },
      messages.map((message, index) =>
        h('li', { className: `message-role-${message.role}`, key: index },
          h(Message, { message })
        )
      )
    ),
    h('form', { className: 'flex', onSubmit: handleSubmit }, [
      h('input', {
        value: prompt,
        className: 'input',
        placeholder: 'Enter something...',
        onInput: e => setPrompt(e.target.value),
      }),
      h('button', { className: 'button button-primary', type: 'submit' }, 'Send'),
    ]),
    h('p', { className: 'copyright' }, `Based on Ollama API (${model}).`)
  ]);
};

ready(() => {
  const app = document.getElementById('app');
  render(h(App), app);
});
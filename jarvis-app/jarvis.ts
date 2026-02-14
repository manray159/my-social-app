import { exec } from 'child_process';

const say = (text: string) => {
  console.log("Джарвис:", text);
  exec(`say -v "Yuri" "${text}"`);
};

// Функция для управления музыкой на Mac
const playMusic = (track: string) => {
  const script = `
    tell application "Music"
      play track "${track}"
    end tell
  `;
  exec(`osascript -e '${script}'`, (err) => {
    if (err) say("Извините, сэр, я не нашел этот трек в вашей медиатеке.");
  });
};

const handleCommand = (input: string) => {
  const cmd = input.toLowerCase();

  if (cmd.includes("включи") || cmd.includes("поставь")) {
    if (cmd.includes("back in black") || cmd.includes("ac/dc")) {
      say("Отличный выбор, сэр. Включаю AC/DC.");
      playMusic("Back In Black");
    }
  } 
  else if (cmd.includes("привет")) {
    say("Приветствую, сэр. Чем могу помочь?");
  }
};

// ВНИМАНИЕ: Чтобы это работало без окон, нам нужен мост к микрофону.
// Пока мы не настроили сложный Vosk, давай заставим его слушать через стандартную диктовку Mac:
say("Система готова. Нажмите Fn дважды (или вашу клавишу диктовки) и говорите.");

// Для теста вручную:
// handleCommand("Джарвис, включи бэк ин блэк");
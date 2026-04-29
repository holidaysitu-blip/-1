import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, PlusCircle, MoreHorizontal, Book } from 'lucide-react';
import { askXiaoWu } from '../lib/gemini';
import { Message } from '../types';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '欢迎来到章园，我是小吴。有什么我可以帮您的吗？您可以问我关于养生课程、膏方选购或是章园的历史。' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  async function handleSend() {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const responseText = await askXiaoWu(input);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="px-6 py-3 bg-[#F5F5F5] border-b border-primary/10 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-primary">小吴 AI 助手</span>
        </div>
        <MoreHorizontal className="w-5 h-5 text-primary" />
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-paper-texture pb-32"
      >
        <div className="text-center">
          <span className="text-[10px] text-slate-400 bg-slate-200/50 px-3 py-1 rounded-full border border-primary/5 uppercase tracking-widest">
            今天 10:00
          </span>
        </div>

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
            >
              <div className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-[#F2F2F2] text-primary border border-primary/5 rounded-tl-none'
              }`}>
                {msg.role === 'model' && <span className="block text-[8px] font-bold uppercase tracking-wider mb-1 opacity-50">小吴 AI</span>}
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start items-center gap-2"
            >
              <div className="flex items-center justify-center p-2">
                 <div className="w-1 h-1 bg-primary/20 rounded-full animate-bounce" />
                 <div className="w-1 h-1 bg-primary/20 rounded-full animate-bounce delay-100 mx-1" />
                 <div className="w-1 h-1 bg-primary/20 rounded-full animate-bounce delay-200" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-primary/5 flex items-center gap-3 pb-safe z-40">
        <button className="text-slate-400 hover:text-primary transition-colors p-2">
          <Mic className="w-6 h-6" />
        </button>
        <div className="flex-1 bg-[#F2F2F2] rounded-xl flex items-center px-4 py-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入你想了解的内容..."
            className="w-full bg-transparent border-none focus:ring-0 text-sm py-1 font-sans placeholder:text-slate-400"
          />
        </div>
        <PlusCircle className="w-6 h-6 text-slate-400 cursor-pointer" />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4 ml-0.5 fill-current" />
        </button>
      </div>
    </div>
  );
}

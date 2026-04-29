import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Row = {
  id: string;
  user_name: string;
  user_phone: string;
  status: string;
  created_at: string;
};

const PASSWORD = "zyyx2026";

export default function Admin() {
  const [pwd, setPwd] = useState("");
  const [ok, setOk] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  async function loadData() {
    const { data } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });

    setRows(data || []);
  }

  useEffect(() => {
    if (ok) loadData();
  }, [ok]);

  if (!ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4">章园夜校后台</h1>
          <input
            type="password"
            placeholder="请输入密码"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 mb-4"
          />
          <button
            onClick={() => {
              if (pwd === PASSWORD) setOk(true);
              else alert("密码错误");
            }}
            className="w-full bg-primary text-white py-3 rounded-xl"
          >
            进入后台
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">报名名单</h1>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">姓名</th>
                <th className="p-3 text-left">电话</th>
                <th className="p-3 text-left">状态</th>
                <th className="p-3 text-left">时间</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{item.user_name}</td>
                  <td className="p-3">{item.user_phone}</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3">
                    {new Date(item.created_at).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="p-6 text-center text-gray-500">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
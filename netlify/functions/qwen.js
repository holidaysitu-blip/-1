exports.handler = async function (event) {
  try {
    const { prompt } = JSON.parse(event.body || "{}");

    const apiKey = process.env.QWEN_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "未配置 QWEN_API_KEY" }),
      };
    }

    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-turbo",
          messages: [
            {
              role: "system",
              content:
                "你叫小吴，是章园夜校的智能助手。你温润、简洁、有文化气质，负责介绍章园、推荐课程、回答养生与夜校相关问题。称呼用户为园友。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        text:
          data?.choices?.[0]?.message?.content ||
          data?.error?.message ||
          "小吴暂时没有生成内容。",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
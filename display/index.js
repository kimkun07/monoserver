async function fetchYamlConfig() {
  try {
    const response = await fetch("/services/aigen.yaml");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const yamlText = await response.text();
    console.log("YAML 내용:", yamlText);
  } catch (error) {
    console.error("YAML 파일을 불러오는데 실패했습니다:", error);
  }
}

// 페이지 로드 시 실행
console.log("index.js가 로드되었습니다.");
fetchYamlConfig();

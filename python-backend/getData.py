from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
import time
import tempfile
import json
import os
from datetime import datetime, timedelta

url = "https://fireant.vn/dashboard"

options = Options()
# Bỏ comment dòng dưới để chạy không headless (hiện cửa sổ Chrome)
# options.add_argument("--headless")
# Bật chế độ headless để chạy trên môi trường không có GUI
options.add_argument("--headless")
options.add_argument("--disable-gpu")
options.add_argument("--window-size=1920,1080")

# Chỉ định thư mục user-data-dir tạm thời để tránh xung đột
user_data_dir = tempfile.mkdtemp()
options.add_argument(f"--user-data-dir={user_data_dir}")

driver = webdriver.Chrome(options=options)
driver.get(url)

# Tự động đóng popup thông báo nếu có
try:
    WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.XPATH, "//button[.//span[contains(text(), 'Để sau')]]"))
    )
    driver.find_element(By.XPATH, "//button[.//span[contains(text(), 'Để sau')]]").click()
    print("Đã tự động đóng popup thông báo!")
except Exception:
    print("Không thấy popup thông báo hoặc đã đóng.")

# Chờ chart xuất hiện
WebDriverWait(driver, 30).until(
    EC.presence_of_element_located((By.XPATH, "//h6[contains(text(), 'Phân bổ dòng tiền')]") )
)

# Lấy tất cả canvas sau tiêu đề "Phân bổ dòng tiền"
canvases = driver.find_elements(
    By.XPATH, "//h6[contains(text(), 'Phân bổ dòng tiền')]/following-sibling::div//canvas"
)
canvas = None
for c in canvases:
    if c.get_attribute("data-zr-dom-id") == "zr_0" and c.size['width'] == 468 and c.size['height'] == 184:
        canvas = c
        break

if not canvas:
    print("Không tìm thấy đúng canvas cần lấy!")
    driver.quit()
    exit()

# Hover nhiều điểm trên cả trục X và Y để tăng xác suất lấy đủ tooltip
actions = ActionChains(driver)
results = dict()

# Danh sách 3 điểm cần lấy
points = [(-100, 40), (-20, 40), (180, 0)]
def get_chart_data():
    data = {}
    for x, y in points:
        print(f"Hover tại ({x},{y})...")
        actions.move_to_element_with_offset(canvas, x, y).perform()
        time.sleep(1)
        tooltips = driver.find_elements(By.XPATH, "//div[contains(@style, 'z-index: 9999999')]")
        found = None
        for tip in tooltips:
            txt = tip.text.strip()
            if txt:
                found = txt
                break
        data[f"{x},{y}"] = found if found else ""
    return data

# Lặp vô hạn, mỗi 10s lấy dữ liệu và ghi ra file chart-jsdata.json


def wait_until_next_valid_time():
    now = datetime.now()
    weekday = now.weekday()  # 0=Monday, 6=Sunday
    hour = now.hour
    minute = now.minute
    # Nếu là thứ 7, CN: chờ đến 9h thứ 2
    if weekday >= 5:
        # days to next Monday
        days_ahead = 7 - weekday
        next_time = (now + timedelta(days=days_ahead)).replace(hour=9, minute=0, second=0, microsecond=0)
        wait_sec = (next_time - now).total_seconds()
        print(f"Ngoài giờ giao dịch (thứ 7/CN). Chờ đến 9h thứ 2 ({next_time})...")
        time.sleep(wait_sec)
        return
    # Nếu trước 9h sáng: chờ đến 9h hôm nay
    if hour < 9:
        next_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
        wait_sec = (next_time - now).total_seconds()
        print(f"Chưa đến giờ giao dịch (trước 9h). Chờ đến 9h ({next_time})...")
        time.sleep(wait_sec)
        return
    # Nếu sau 15h: chờ đến 9h ngày làm việc tiếp theo
    if hour > 15 or (hour == 15 and minute > 0):
        # next weekday
        next_day = now + timedelta(days=1)
        while next_day.weekday() >= 5:
            next_day += timedelta(days=1)
        next_time = next_day.replace(hour=9, minute=0, second=0, microsecond=0)
        wait_sec = (next_time - now).total_seconds()
        print(f"Đã hết giờ giao dịch (sau 15h). Chờ đến 9h ngày làm việc tiếp theo ({next_time})...")
        time.sleep(wait_sec)
        return
    # Nếu trong khoảng 9h-15h: không chờ
    return

try:
    while True:
        # Chỉ lấy data trong khung 9h-15h, thứ 2-6
        now = datetime.now()
        weekday = now.weekday()
        hour = now.hour
        minute = now.minute
        if weekday >= 5 or hour < 9 or hour > 15 or (hour == 15 and minute > 0):
            wait_until_next_valid_time()
            continue
        chart_data = get_chart_data()
        # Thêm timestamp cho mỗi lần lấy
        entry = {
            "timestamp": now.isoformat(),
            "data": chart_data
        }
        # Đọc dữ liệu cũ nếu có
        data_list = []
        if os.path.exists("chart-jsdata.json"):
            try:
                with open("chart-jsdata.json", "r", encoding="utf-8") as f:
                    data_list = json.load(f)
                    if not isinstance(data_list, list):
                        data_list = []
            except Exception:
                data_list = []
        data_list.append(entry)
        with open("chart-jsdata.json", "w", encoding="utf-8") as f:
            json.dump(data_list, f, ensure_ascii=False, indent=2)
        print("Đã thêm dữ liệu vào chart-jsdata.json:", entry)
        time.sleep(10)
except KeyboardInterrupt:
    print("Đã dừng script.")

driver.quit()


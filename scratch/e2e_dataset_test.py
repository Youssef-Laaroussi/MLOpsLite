import requests
import json

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YTUxNDI3OS00MDczLTRiNjItOWFjNC0zZGYyNmU2NzdjMTMiLCJlbWFpbCI6ImFkbWluQG1saXRlLmxvY2FsIiwiZXhwIjoxNzkyODY2ODExLCJpYXQiOjE3OTI4NjMyMTEsInR5cGUiOiJhY2Nlc3MifQ.kckM3Bo7hjeqFUL4mKOkMAoRle6QJ4K9OIS2-QExppk"
headers = {"Authorization": f"Bearer {TOKEN}"}

# 1. Create dataset metadata
dataset_payload = {
    "name": "credit-risk-dataset",
    "description": "Production credit card fraud detection transactions"
}
res = requests.post(f"{BASE_URL}/datasets/", json=dataset_payload, headers=headers)
print("Create dataset status:", res.status_code)
dataset = res.json()
print("Dataset created:", json.dumps(dataset, indent=2))
dataset_id = dataset["id"]

# 2. Upload real CSV file
csv_content = """transaction_id,amount,user_id,is_fraud
tx_1001,45.50,usr_44,0
tx_1002,1200.00,usr_89,1
tx_1003,15.20,usr_12,0
tx_1004,340.80,usr_55,0
tx_1005,5000.00,usr_99,1
"""

files = {"file": ("credit_transactions.csv", csv_content, "text/csv")}
upload_res = requests.post(f"{BASE_URL}/datasets/{dataset_id}/upload", files=files, headers=headers)
print("Upload status:", upload_res.status_code)
version_data = upload_res.json()
print("Version uploaded:", json.dumps(version_data, indent=2))

# 3. List datasets again
list_res = requests.get(f"{BASE_URL}/datasets/", headers=headers)
print("List datasets status:", list_res.status_code)
print("Updated datasets in DB:", json.dumps(list_res.json(), indent=2))

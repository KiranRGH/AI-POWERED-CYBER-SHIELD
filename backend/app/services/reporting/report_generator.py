def generate_csv_report(data, path):
    import pandas as pd
    df = pd.DataFrame(data)
    df.to_csv(path, index=False)

def generate_pdf_report(data, path):
    # Using a simple mock for PDF generation since ReportLab requires more setup
    with open(path, "w") as f:
        f.write("PDF Report content...")

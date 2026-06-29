from backend.services.index_service import index_all_documents


if __name__ == "__main__":
    result = index_all_documents()
    print(result["message"])
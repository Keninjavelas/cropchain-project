package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing a Product
type SmartContract struct {
	contractapi.Contract
}

// Product describes basic details of what is being tracked
type Product struct {
	ID                 string `json:"ID"`
	Type               string `json:"type"`
	Farmer             string `json:"farmer"`
	Owner              string `json:"owner"`
	Timestamp          int64  `json:"timestamp"`
	MarketPriceHash    string `json:"marketPriceHash"`
	CertificationIPFSHash string `json:"certificationIPFSHash"`
}

// HistoryQueryResult structure used for returning history of a product
type HistoryQueryResult struct {
	Record    *Product  `json:"record"`
	TxId      string    `json:"txId"`
	Timestamp time.Time `json:"timestamp"`
	IsDelete  bool      `json:"isDelete"`
}

// CreateProduct issues a new product to the world state with given details.
func (s *SmartContract) CreateProduct(ctx contractapi.TransactionContextInterface, id string, productType string, farmer string, marketPriceHash string, certHash string) error {
	exists, err := s.ProductExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the product %s already exists", id)
	}

	product := Product{
		ID:                 id,
		Type:               productType,
		Farmer:             farmer,
		Owner:              farmer, // Initially, farmer is the owner
		Timestamp:          time.Now().Unix(),
		MarketPriceHash:    marketPriceHash,
		CertificationIPFSHash: certHash,
	}
	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, productJSON)
}

// ShipProduct updates the owner of a product to a new shipper.
func (s *SmartContract) ShipProduct(ctx contractapi.TransactionContextInterface, id string, newOwner string) error {
	product, err := s.ReadProduct(ctx, id)
	if err != nil {
		return err
	}

	product.Owner = newOwner
	product.Timestamp = time.Now().Unix()

	productJSON, err := json.Marshal(product)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, productJSON)
}

// ReceiveProduct is functionally similar to ShipProduct but represents the end of a transfer.
// This allows for a clear "receive" event in the product's history.
func (s *SmartContract) ReceiveProduct(ctx contractapi.TransactionContextInterface, id string, newOwner string) error {
    return s.ShipProduct(ctx, id, newOwner) // Re-use the same logic to update owner
}

// ReadProduct returns the product stored in the world state with given id.
func (s *SmartContract) ReadProduct(ctx contractapi.TransactionContextInterface, id string) (*Product, error) {
	productJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if productJSON == nil {
		return nil, fmt.Errorf("the product %s does not exist", id)
	}

	var product Product
	err = json.Unmarshal(productJSON, &product)
	if err != nil {
		return nil, err
	}

	return &product, nil
}

// ProductExists returns true when product with given ID exists in world state
func (s *SmartContract) ProductExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	productJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return productJSON != nil, nil
}

// GetProductHistory returns the chain of custody for a product since issuance.
func (s *SmartContract) GetProductHistory(ctx contractapi.TransactionContextInterface, id string) ([]HistoryQueryResult, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var product Product
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &product)
			if err != nil {
				return nil, err
			}
		} else {
			product = Product{
				ID: id,
			}
		}

		records = append(records, HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: response.Timestamp.AsTime(),
			Record:    &product,
			IsDelete:  response.IsDelete,
		})
	}

	return records, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating cropchain chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting cropchain chaincode: %v", err)
	}
}
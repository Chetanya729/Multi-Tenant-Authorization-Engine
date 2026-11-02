package org.example.multitenant.service;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class TransferService {

    @PreAuthorize("@dutyChecker.has('transfer:approve')")
    public void approve(){

    }

}
